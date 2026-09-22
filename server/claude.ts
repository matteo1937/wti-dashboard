import Anthropic from "@anthropic-ai/sdk";
import { assertBudgetAvailable, recordUsage } from "./costGuard";
import { PRODUCT_CATEGORIES, type ProductRecognition } from "./types";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";

const SUPPORTED_MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type SupportedMediaType = (typeof SUPPORTED_MEDIA_TYPES)[number];

export function isSupportedMediaType(mediaType: string): mediaType is SupportedMediaType {
  return (SUPPORTED_MEDIA_TYPES as readonly string[]).includes(mediaType);
}

const RECORD_PRODUCT_TOOL: Anthropic.Tool = {
  name: "record_product",
  description:
    "Erfasst die erkannten Eigenschaften eines Elektroinstallations-Produkts anhand eines Fotos.",
  input_schema: {
    type: "object",
    properties: {
      hersteller: {
        type: ["string", "null"],
        description: "Herstellername, z.B. 'Feller', 'Hager', 'ABB'. null falls nicht erkennbar."
      },
      produktname: {
        type: ["string", "null"],
        description: "Produkt- bzw. Serienname, z.B. 'EDIZIOdue'. null falls nicht erkennbar."
      },
      typBezeichnung: {
        type: ["string", "null"],
        description: "Typenbezeichnung/Artikelcode auf dem Produkt, falls sichtbar, sonst null."
      },
      kategorie: {
        type: "string",
        enum: PRODUCT_CATEGORIES,
        description: "Produktkategorie."
      },
      verwendungszweck: {
        type: "string",
        description: "Kurze Erklärung (1-2 Sätze) wofür das Produkt verwendet wird."
      },
      merkmale: {
        type: "array",
        items: { type: "string" },
        description: "Sichtbare Merkmale, z.B. Farbe, Anzahl Module, IP-Schutzklasse, Ampere-Wert."
      },
      konfidenz: {
        type: "string",
        enum: ["hoch", "mittel", "niedrig"],
        description: "Wie sicher ist die Erkennung insgesamt."
      },
      unsicher: {
        type: "boolean",
        description: "true, wenn Hersteller oder Produktname nur geraten sind."
      },
      ersatzSuchkriterien: {
        type: "string",
        description:
          "KEIN konkretes Produkt/keine Artikelnummer (die kennst du nicht zuverlässig!), sondern " +
          "eine kurze, konkrete Liste von Such-/Filterkriterien, mit denen der Installateur beim " +
          "Grossisten (z.B. Elektro-Material AG) selbst nach einem gleichwertigen Ersatzprodukt " +
          "suchen kann, z.B. 'LED-Einbauspot, 7W, DC350mA Konstantstrom-Treiber, IP20, Ø~55mm " +
          "Einbaumass, Schutzklasse III'."
      },
      ersatzprodukte: {
        type: "array",
        description:
          "1-3 bekannte Hersteller/Produktlinien, die in der Schweiz üblicherweise als kompatible " +
          "Alternative zu diesem Produkt gelten (z.B. 'Hager' als Alternative zu 'Feller' bei " +
          "Schweizer Steckdosen). Das ist allgemeines Marktwissen über Hersteller-Produktlinien, " +
          "KEIN Katalog-Abgleich. Leeres Array, wenn Kategorie/Hersteller zu unklar sind, um seriös " +
          "eine Alternative zu nennen. NIE eine konkrete Artikelnummer, Preis oder Verfügbarkeit " +
          "nennen – das weisst du nicht.",
        items: {
          type: "object",
          properties: {
            hersteller: { type: "string", description: "Name des alternativen Herstellers." },
            produktlinie: {
              type: "string",
              description: "Name der Produktlinie/Serie, die als Ersatz infrage kommt."
            },
            kompatibilitaetshinweis: {
              type: "string",
              description:
                "Kurzer Hinweis (1 Satz), warum/wie kompatibel, und worauf beim Wechsel zu achten " +
                "ist (z.B. andere Abdeckrahmen-Grösse, andere Montagetiefe)."
            }
          },
          required: ["hersteller", "produktlinie", "kompatibilitaetshinweis"]
        }
      }
    },
    required: [
      "kategorie",
      "verwendungszweck",
      "merkmale",
      "konfidenz",
      "unsicher",
      "ersatzSuchkriterien",
      "ersatzprodukte"
    ]
  }
};

const SYSTEM_PROMPT = `Du bist ein Experte für Schweizer Elektroinstallationsmaterial (Niederspannungsinstallation gemäss NIN/SEV).
Du hilfst Elektroinstallateuren auf der Baustelle, ein fotografiertes Produkt zu identifizieren:
Steckdosen, Schalter, Sicherungsautomaten, FI/RCD-Schutzschalter, Kabel, Verteiler, Klemmen, Leuchten etc.
Achte auf sichtbare Beschriftungen, Herstellerlogos, Farbcodes und Formfaktoren (z.B. Schweizer Typ-13-Steckdosen,
Hager/ABB/Feller/Legrand/Gira-Designlinien). Wenn du dir nicht sicher bist, gib das ehrlich mit niedriger
Konfidenz und unsicher=true an, anstatt Informationen zu erfinden. Erfinde insbesondere NIE eine
konkrete Artikelnummer, einen Preis oder eine Verfügbarkeitsaussage zu einem anderen Produkt – dafür
fehlt dir der Zugriff auf einen echten Produktkatalog. Bei 'ersatzprodukte' darfst du basierend auf
deinem allgemeinen Marktwissen bekannte Hersteller/Produktlinien nennen, die üblicherweise als
kompatible Alternative gelten (z.B. welche Hersteller ähnliche Schweizer Steckdosen-Designlinien
anbieten) – das ist erlaubt, solange es bei Hersteller/Produktlinien-Ebene bleibt und nie eine
konkrete Artikelnummer, einen Preis oder eine Lagerverfügbarkeit vortäuscht. Gib zusätzlich bei
'ersatzSuchkriterien' die technischen Such-/Filterkriterien an, mit denen der Installateur selbst
beim Grossisten filtern kann. Antworte ausschliesslich über den Tool-Aufruf 'record_product' auf
Deutsch.`;

export async function recognizeProductFromImage(
  imageBase64: string,
  mediaType: SupportedMediaType
): Promise<ProductRecognition> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY ist nicht gesetzt. Siehe .env.example.");
  }

  assertBudgetAvailable();

  const anthropic = new Anthropic({ apiKey });

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    tools: [RECORD_PRODUCT_TOOL],
    tool_choice: { type: "tool", name: "record_product" },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: imageBase64 }
          },
          {
            type: "text",
            text: "Identifiziere dieses Elektroinstallations-Produkt und rufe das Tool 'record_product' mit den erkannten Daten auf."
          }
        ]
      }
    ]
  });

  recordUsage(MODEL, message.usage.input_tokens, message.usage.output_tokens);

  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use" && block.name === "record_product"
  );

  if (!toolUse) {
    throw new Error("Claude hat keine strukturierten Produktdaten zurückgegeben.");
  }

  return toolUse.input as ProductRecognition;
}

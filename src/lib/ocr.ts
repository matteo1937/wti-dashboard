import Tesseract from "tesseract.js";

export interface OcrSuggestion {
  rawText: string;
  eventDate: string | null; // ISO YYYY-MM-DD
  eventTime: string | null; // HH:MM
  location: string | null;
  client: string | null;
  title: string | null;
}

const MONTHS: Record<string, number> = {
  januar: 1,
  jan: 1,
  februar: 2,
  feb: 2,
  märz: 3,
  maerz: 3,
  mär: 3,
  april: 4,
  apr: 4,
  mai: 5,
  juni: 6,
  jun: 6,
  juli: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sep: 9,
  sept: 9,
  oktober: 10,
  okt: 10,
  november: 11,
  nov: 11,
  dezember: 12,
  dez: 12
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toIsoDate(day: number, month: number, year: number): string | null {
  if (year < 100) year += 2000;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year}-${pad(month)}-${pad(day)}`;
}

function findDate(text: string): string | null {
  // z.B. 12.05.2026, 12/05/2026, 12.5.26
  const numeric = text.match(/\b(\d{1,2})[.\/](\d{1,2})[.\/](\d{2,4})\b/);
  if (numeric) {
    const iso = toIsoDate(Number(numeric[1]), Number(numeric[2]), Number(numeric[3]));
    if (iso) return iso;
  }

  // z.B. "12. Mai 2026" oder "12 Mai 2026"
  const monthNames = Object.keys(MONTHS).join("|");
  const named = new RegExp(`\\b(\\d{1,2})\\.?\\s+(${monthNames})\\.?\\s+(\\d{4})\\b`, "i").exec(text);
  if (named) {
    const month = MONTHS[named[2].toLowerCase()];
    const iso = toIsoDate(Number(named[1]), month, Number(named[3]));
    if (iso) return iso;
  }

  return null;
}

function findTime(text: string): string | null {
  const match = text.match(/\b([01]?\d|2[0-3])[:.]([0-5]\d)\s*(uhr)?\b/i);
  if (!match) return null;
  return `${pad(Number(match[1]))}:${match[2]}`;
}

function findLabelled(text: string, labels: string[]): string | null {
  for (const label of labels) {
    const re = new RegExp(`^\\s*${label}\\s*:?\\s*(.+)$`, "im");
    const match = text.match(re);
    if (match && match[1].trim().length > 0) {
      return match[1].trim().replace(/["<>]/g, "").slice(0, 200);
    }
  }
  return null;
}

function findLocation(text: string): string | null {
  const labelled = findLabelled(text, ["ort", "adresse", "veranstaltungsort", "location"]);
  if (labelled) return labelled;

  // Schweizer PLZ + Ort, z.B. "3800 Interlaken"
  const plz = text.match(/\b(\d{4})\s+([A-ZÄÖÜ][a-zäöüA-ZÄÖÜß-]+)\b/);
  if (plz) return `${plz[1]} ${plz[2]}`;

  return null;
}

export async function extractTextFromImage(
  file: File | Blob,
  onProgress?: (percent: number) => void
): Promise<string> {
  const result = await Tesseract.recognize(file, "deu", {
    logger: (msg) => {
      if (msg.status === "recognizing text" && typeof msg.progress === "number") {
        onProgress?.(Math.round(msg.progress * 100));
      }
    }
  });
  return result.data.text;
}

export function parseBookingDetails(rawText: string): OcrSuggestion {
  const client = findLabelled(rawText, ["von", "from", "absender"]);
  const title = findLabelled(rawText, ["betreff", "subject", "thema"]);

  return {
    rawText,
    eventDate: findDate(rawText),
    eventTime: findTime(rawText),
    location: findLocation(rawText),
    client,
    title
  };
}

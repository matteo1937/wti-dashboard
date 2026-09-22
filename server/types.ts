export type ProductCategory =
  | "Steckdose"
  | "Schalter"
  | "Sicherungsautomat"
  | "FI-Schutzschalter"
  | "Kabel"
  | "Verteiler"
  | "Klemme"
  | "Leuchte"
  | "Sonstiges";

export interface ProductRecognition {
  hersteller: string | null;
  produktname: string | null;
  typBezeichnung: string | null;
  kategorie: ProductCategory;
  verwendungszweck: string;
  merkmale: string[];
  konfidenz: "hoch" | "mittel" | "niedrig";
  unsicher: boolean;
  ersatzSuchkriterien: string;
}

export type RecognitionSource = "foto_ki" | "datenbank";

export type Grossist = "EM" | "Sonepar" | "Otto Fischer" | "Bugnard";

export const GROSSISTEN: Grossist[] = ["EM", "Sonepar", "Otto Fischer", "Bugnard"];

export interface GrossistMatch {
  grossist: Grossist;
  eldasNummer: string;
  shopUrl: string | null;
  verfuegbar: boolean;
  preisChf: number | null;
  matchQuality: "ean" | "fuzzy";
}

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  "Steckdose",
  "Schalter",
  "Sicherungsautomat",
  "FI-Schutzschalter",
  "Kabel",
  "Verteiler",
  "Klemme",
  "Leuchte",
  "Sonstiges"
];

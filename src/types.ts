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

export interface GrossistMatch {
  grossist: Grossist;
  eldasNummer: string;
  shopUrl: string | null;
  verfuegbar: boolean;
  preisChf: number | null;
  matchQuality: "ean" | "fuzzy";
}

export interface ScanResponse {
  result: ProductRecognition;
  source: RecognitionSource;
  eanBarcode?: string;
  grossist: GrossistMatch | null;
  savedByUserName?: string;
  manuellKorrigiert?: boolean;
}

export interface RecognizeErrorResponse {
  error: string;
}

export type UserRole = "admin" | "mitglied";

export interface MeResponse {
  userId: string;
  userName: string;
  orgId: string;
  role: UserRole;
}

export interface ScanHistoryEntry {
  id: string;
  userId: string;
  userName: string;
  erkanntVia: "foto_ki" | "barcode_db";
  eanBarcode: string | null;
  produkt: ProductRecognition;
  projektTag: string | null;
  manuellKorrigiert: boolean;
  createdAt: string;
}

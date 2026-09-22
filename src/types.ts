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
}

export interface RecognizeResponse {
  result: ProductRecognition;
}

export interface RecognizeErrorResponse {
  error: string;
}

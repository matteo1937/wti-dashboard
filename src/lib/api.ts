import type {
  ProductRecognition,
  RecognizeErrorResponse,
  ScanHistoryEntry,
  ScanResponse
} from "../types";

function fileToBase64(file: File): Promise<{ data: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const [meta, data] = result.split(",");
      const mediaType = meta.match(/data:(.*);base64/)?.[1] ?? file.type;
      resolve({ data, mediaType });
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function parseErrorResponse(response: Response): Promise<string> {
  const body = (await response.json().catch(() => null)) as RecognizeErrorResponse | null;
  return body?.error ?? `Anfrage fehlgeschlagen (Status ${response.status})`;
}

export async function recognizeProduct(file: File, projektTag?: string): Promise<ScanResponse> {
  const { data, mediaType } = await fileToBase64(file);

  const response = await fetch("/api/recognize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64: data, mediaType, projektTag })
  });

  if (!response.ok) {
    throw new Error(await parseErrorResponse(response));
  }

  return (await response.json()) as ScanResponse;
}

export async function lookupProductByBarcode(
  ean: string,
  projektTag?: string
): Promise<ScanResponse | null> {
  const query = projektTag ? `?projektTag=${encodeURIComponent(projektTag)}` : "";
  const response = await fetch(`/api/products/by-ean/${encodeURIComponent(ean)}${query}`);

  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(await parseErrorResponse(response));
  }

  return (await response.json()) as ScanResponse;
}

export async function saveProductForBarcode(
  ean: string,
  product: ProductRecognition
): Promise<ScanResponse> {
  const response = await fetch("/api/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eanBarcode: ean, product })
  });

  if (!response.ok) {
    throw new Error(await parseErrorResponse(response));
  }

  return (await response.json()) as ScanResponse;
}

export async function correctProduct(ean: string, product: ProductRecognition): Promise<ScanResponse> {
  const response = await fetch(`/api/products/${encodeURIComponent(ean)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ product })
  });

  if (!response.ok) {
    throw new Error(await parseErrorResponse(response));
  }

  return (await response.json()) as ScanResponse;
}

export interface ScanHistoryFilter {
  userId?: string;
  projektTag?: string;
  von?: string;
  bis?: string;
}

function filterToQuery(filter: ScanHistoryFilter): string {
  const params = new URLSearchParams();
  if (filter.userId) params.set("userId", filter.userId);
  if (filter.projektTag) params.set("projektTag", filter.projektTag);
  if (filter.von) params.set("von", filter.von);
  if (filter.bis) params.set("bis", filter.bis);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function fetchScanHistory(filter: ScanHistoryFilter): Promise<ScanHistoryEntry[]> {
  const response = await fetch(`/api/scans${filterToQuery(filter)}`);
  if (!response.ok) {
    throw new Error(await parseErrorResponse(response));
  }
  const body = (await response.json()) as { scans: ScanHistoryEntry[] };
  return body.scans;
}

export function scanHistoryExportUrl(filter: ScanHistoryFilter, format: "csv" | "pdf"): string {
  const params = new URLSearchParams(filterToQuery(filter).replace(/^\?/, ""));
  params.set("format", format);
  return `/api/scans/export?${params.toString()}`;
}

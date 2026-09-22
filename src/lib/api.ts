import type { ProductRecognition, RecognizeErrorResponse, ScanResponse } from "../types";

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

export async function recognizeProduct(file: File): Promise<ScanResponse> {
  const { data, mediaType } = await fileToBase64(file);

  const response = await fetch("/api/recognize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64: data, mediaType })
  });

  if (!response.ok) {
    throw new Error(await parseErrorResponse(response));
  }

  return (await response.json()) as ScanResponse;
}

export async function lookupProductByBarcode(ean: string): Promise<ScanResponse | null> {
  const response = await fetch(`/api/products/by-ean/${encodeURIComponent(ean)}`);

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

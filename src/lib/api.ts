import type { ProductRecognition, RecognizeErrorResponse, RecognizeResponse } from "../types";

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

export async function recognizeProduct(file: File): Promise<ProductRecognition> {
  const { data, mediaType } = await fileToBase64(file);

  const response = await fetch("/api/recognize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64: data, mediaType })
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as RecognizeErrorResponse | null;
    throw new Error(body?.error ?? `Erkennung fehlgeschlagen (Status ${response.status})`);
  }

  const body = (await response.json()) as RecognizeResponse;
  return body.result;
}

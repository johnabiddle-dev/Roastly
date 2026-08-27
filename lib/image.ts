/** Normalize client image payloads before sending them to xAI. */

export type ImageMime = "image/jpeg" | "image/png";

export type NormalizedImage = {
  mime: ImageMime;
  data: string;
};

function stripDataUrl(input: string): { mimeHint?: ImageMime; data: string } {
  const trimmed = input.trim();
  const match = trimmed.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,(.+)$/i);
  if (match) {
    const rawMime = match[1].toLowerCase();
    const mimeHint: ImageMime | undefined =
      rawMime === "image/png" ? "image/png" : rawMime === "image/jpeg" || rawMime === "image/jpg" ? "image/jpeg" : undefined;
    return { mimeHint, data: match[2].replace(/\s+/g, "") };
  }
  return { data: trimmed.replace(/\s+/g, "") };
}

function sniffMime(bytes: Uint8Array): ImageMime | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  return null;
}

export function normalizeImageBase64(imageBase64: unknown): NormalizedImage | { error: string } {
  if (typeof imageBase64 !== "string" || !imageBase64.trim()) {
    return { error: "No image provided" };
  }

  const { mimeHint, data } = stripDataUrl(imageBase64);

  if (data.length > 5_000_000) {
    return { error: "Image too large" };
  }

  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.from(Buffer.from(data, "base64"));
  } catch {
    return { error: "Invalid image encoding. Upload a JPEG or PNG." };
  }

  if (bytes.length < 24) {
    return { error: "Invalid image. Upload a JPEG or PNG." };
  }

  const sniffed = sniffMime(bytes);
  if (!sniffed) {
    return { error: "Invalid image. Use a JPEG or PNG (HEIC/screenshots must be converted first)." };
  }

  if (mimeHint && mimeHint !== sniffed) {
    // Trust the bytes, not the data-URL label.
  }

  return { mime: sniffed, data };
}

export function toDataUrl(image: NormalizedImage): string {
  return `data:${image.mime};base64,${image.data}`;
}

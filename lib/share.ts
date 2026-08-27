import { generateRoastCardImage, type CardOptions } from "@/lib/generate-card";
import { getJuly4PromoHook } from "@/lib/promo";

function isMobileShare(): boolean {
  if (typeof navigator === "undefined" || !navigator.share) return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent || "");
}

export function shareButtonLabel(): string {
  return isMobileShare() ? "Share" : "Copy card";
}

export function groupChatCaption(roastText: string, styleLabel?: string): string {
  const hook = getJuly4PromoHook();
  const short = roastText.replace(/\n/g, " ").replace(/\s+/g, " ").trim().slice(0, 140);
  const style = styleLabel && styleLabel !== "Default" ? ` (${styleLabel} mode)` : "";
  const caption = `${hook}Just got absolutely roasted by @RoastlyApp${style} 😂

"${short}"

Send this to someone → https://roastly-app.vercel.app/roast

#Roastly #Grok`;
  return caption.length > 280 ? caption.slice(0, 277) + "…" : caption;
}

async function cardFile(imageUrl: string, roastText: string, options: boolean | CardOptions) {
  const dataUrl = await generateRoastCardImage(imageUrl, roastText, options);
  const [header, data] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] || "image/jpeg";
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const ext = mime.includes("png") ? "png" : "jpg";
  return { file: new File([bytes], `roastly-card.${ext}`, { type: mime }), dataUrl };
}

async function copyPng(dataUrl: string) {
  if (!navigator.clipboard || typeof ClipboardItem === "undefined") {
    throw new Error("Clipboard images are not supported");
  }
  const res = await fetch(dataUrl);
  let blob = await res.blob();
  if (blob.type !== "image/png") {
    const objectUrl = URL.createObjectURL(blob);
    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Failed to decode card image"));
        img.src = objectUrl;
      });
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not get canvas context");
      ctx.drawImage(img, 0, 0);
      const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!png) throw new Error("Failed to encode PNG");
      blob = png;
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }
  await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
}

export async function shareOrCopyCard(
  imageUrl: string,
  roastText: string,
  options: boolean | CardOptions = false
): Promise<"shared" | "copied" | "downloaded"> {
  const { file, dataUrl } = await cardFile(imageUrl, roastText, options);
  if (isMobileShare() && navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
    await navigator.share({
      files: [file],
      title: "Roastly Card",
      text: "Roast them back → https://roastly-app.vercel.app/roast",
    });
    return "shared";
  }
  try {
    await copyPng(dataUrl);
    return "copied";
  } catch {
    const link = document.createElement("a");
    link.download = "roastly-card.jpg";
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    link.remove();
    return "downloaded";
  }
}

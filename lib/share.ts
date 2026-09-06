import { generateRoastCardImage, type CardOptions } from "@/lib/generate-card";
import { getBrowserId } from "@/lib/client";
import { getJuly4PromoHook } from "@/lib/promo";
import { shareUrl } from "@/lib/site";

function isMobileShare(): boolean {
  if (typeof navigator === "undefined" || !navigator.share) return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent || "");
}

export function shareButtonLabel(): string {
  return isMobileShare() ? "Send the card" : "Copy card for iMessage";
}

export function inviteUrl(browserId?: string): string {
  const ref = browserId || (typeof window !== "undefined" ? getBrowserId() : "");
  return shareUrl(ref || null);
}

export function groupChatCaption(roastText: string, styleLabel?: string, browserId?: string): string {
  const hook = getJuly4PromoHook();
  const short = roastText.replace(/\n/g, " ").replace(/\s+/g, " ").trim().slice(0, 140);
  const style = styleLabel && styleLabel !== "Default" ? ` (${styleLabel} mode)` : "";
  const url = inviteUrl(browserId);
  return `${hook}Just got roasted${style} 🔥

"${short}"

Try 3 free roast cards → ${url}
Friend buys a pack ($1 / $4.99 / $19.99) → I get +5. No subscription.`;
}

export function shareInviteText(browserId?: string): string {
  return `Roast anything. Send the card in iMessage / group chat.

Try 3 free roasts → ${inviteUrl(browserId)}
Then packs $1 / $4.99 / $19.99 (one-time). If a friend buys, you get +5.`;
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
  const styleLabel =
    typeof options === "object" && options?.styleLabel && options.styleLabel !== "Default"
      ? options.styleLabel
      : undefined;
  const browserId = getBrowserId();
  if (isMobileShare() && navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
    await navigator.share({
      files: [file],
      title: "Roastly card — send this in the chat",
      text: groupChatCaption(roastText, styleLabel, browserId),
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

export async function copyInviteLink(browserId?: string): Promise<string> {
  const url = inviteUrl(browserId);
  await navigator.clipboard.writeText(url);
  return url;
}

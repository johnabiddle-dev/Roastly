import { ImageResponse } from "next/og";
import { OgFrame } from "@/lib/og-frame";

export const alt = "Roastly — roast anything, send the card, try 3 free roasts";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <OgFrame
        eyebrow="3 free roasts · no subscription"
        title="Roast anything. Send the card."
        subtitle="Upload a photo. Get 5 Grok burns. Drop the card in iMessage or the group chat. Packs $1 / $4.99 / $19.99."
      />
    ),
    { ...size }
  );
}

import { ImageResponse } from "next/og";
import { OgFrame } from "@/lib/og-frame";

export const alt = "Someone sent you a Roastly card — try 3 free roasts";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function ShareOpenGraphImage() {
  return new ImageResponse(
    (
      <OgFrame
        eyebrow="A friend sent you this"
        title="Someone sent you a roast card."
        subtitle="Try 3 free roasts. Then packs $1 / $4.99 / $19.99. No subscription. If you buy, they get +5."
      />
    ),
    { ...size }
  );
}

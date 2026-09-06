export type CardOptions = {
  isUplifting?: boolean;
  styleLabel?: string | null;
  styleAccent?: string;
};

export async function generateRoastCardImage(
  imageUrl: string,
  roastText: string,
  options: boolean | CardOptions = false
): Promise<string> {
  const CARD_WIDTH = 1080;
  const CARD_HEIGHT = 1920;
  const opts: CardOptions = typeof options === "object" && options !== null ? options : { isUplifting: !!options };
  const isUplifting = !!opts.isUplifting;
  const styleLabel = opts.styleLabel && opts.styleLabel !== "Default" ? opts.styleLabel : null;
  const styleAccent = opts.styleAccent || (isUplifting ? "#10b981" : "#ef4444");

  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not get canvas context");

  ctx.fillStyle = "#09090b";
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Failed to load image for card"));
    img.src = imageUrl;
  });

  const photoMaxWidth = 900;
  const photoMaxHeight = 880;
  const borderWidth = 12;
  let photoWidth = img.width;
  let photoHeight = img.height;
  const aspect = photoWidth / photoHeight;
  if (photoWidth > photoMaxWidth || photoHeight > photoMaxHeight) {
    if (aspect > 1) {
      photoWidth = photoMaxWidth;
      photoHeight = Math.round(photoMaxWidth / aspect);
    } else {
      photoHeight = photoMaxHeight;
      photoWidth = Math.round(photoMaxHeight * aspect);
    }
  }

  const photoX = (CARD_WIDTH - photoWidth - borderWidth * 2) / 2;
  const photoY = styleLabel ? 72 : 30;

  if (isUplifting) {
    ctx.save();
    const haloPadding = 35;
    ctx.shadowColor = "#10b981";
    ctx.shadowBlur = 80;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = "rgba(16, 185, 129, 0.18)";
    ctx.fillRect(
      photoX - haloPadding,
      photoY - haloPadding,
      photoWidth + borderWidth * 2 + haloPadding * 2,
      photoHeight + borderWidth * 2 + haloPadding * 2
    );
    ctx.shadowBlur = 40;
    ctx.fillStyle = "rgba(16, 185, 129, 0.12)";
    ctx.fillRect(
      photoX - haloPadding / 2,
      photoY - haloPadding / 2,
      photoWidth + borderWidth * 2 + haloPadding,
      photoHeight + borderWidth * 2 + haloPadding
    );
    ctx.restore();
  }

  ctx.fillStyle = isUplifting ? "#064e3b" : styleLabel ? styleAccent : "#1f2937";
  ctx.fillRect(photoX, photoY, photoWidth + borderWidth * 2, photoHeight + borderWidth * 2);

  const destWidth = photoWidth;
  const destHeight = photoHeight;
  const destX = photoX + borderWidth;
  const destY = photoY + borderWidth;
  const imgAspect = img.width / img.height;
  const destAspect = destWidth / destHeight;
  let sourceX: number;
  let sourceY: number;
  let sourceWidth: number;
  let sourceHeight: number;
  if (imgAspect > destAspect) {
    sourceHeight = img.height;
    sourceWidth = sourceHeight * destAspect;
    sourceX = (img.width - sourceWidth) / 2;
    sourceY = 0;
  } else {
    sourceWidth = img.width;
    sourceHeight = sourceWidth / destAspect;
    sourceX = 0;
    sourceY = (img.height - sourceHeight) / 2;
  }
  ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, destX, destY, destWidth, destHeight);

  const textAreaTop = photoY + photoHeight + borderWidth * 2 + 24;
  const textAreaBottom = CARD_HEIGHT - 140;
  const maxAvailableHeight = Math.max(220, textAreaBottom - textAreaTop);
  const maxTextWidth = CARD_WIDTH - 80;
  const minFontSize = 36;
  const maxFontSize = 72;
  const fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

  let fontSize = minFontSize;
  let lineHeight = fontSize * 1.32;
  let lines: string[] = [];

  const wrapText = (text: string, font: string, maxW: number) => {
    ctx.font = font;
    const rawLines = text.split(/\n|\\n/);
    const result: string[] = [];
    for (const raw of rawLines) {
      const trimmed = raw.trim();
      if (!trimmed) continue;
      const words = trimmed.split(/\s+/);
      let currentLine = "";
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        if (ctx.measureText(testLine).width > maxW * 0.98 && currentLine) {
          result.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) result.push(currentLine);
    }
    return result;
  };

  for (let testSize = maxFontSize; testSize >= minFontSize; testSize -= 2) {
    const testFont = `700 ${testSize}px ${fontFamily}`;
    const testLines = wrapText(roastText, testFont, maxTextWidth);
    const testLineHeight = testSize * 1.32;
    if (testLines.length * testLineHeight <= maxAvailableHeight) {
      fontSize = testSize;
      lines = testLines;
      lineHeight = testLineHeight;
      break;
    }
  }

  if (lines.length === 0) {
    fontSize = minFontSize;
    lineHeight = fontSize * 1.32;
    lines = wrapText(roastText, `700 ${fontSize}px ${fontFamily}`, maxTextWidth);
  }

  let effectiveLineHeight = lineHeight;
  if (lines.length * lineHeight > maxAvailableHeight) {
    effectiveLineHeight = maxAvailableHeight / lines.length;
  }

  const totalHeight = lines.length * effectiveLineHeight;
  let y = textAreaTop + (maxAvailableHeight - totalHeight) / 2;
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.font = `700 ${fontSize}px ${fontFamily}`;
  for (const line of lines) {
    ctx.fillText(line, CARD_WIDTH / 2, y);
    y += effectiveLineHeight;
  }

  if (styleLabel) {
    const badge = styleLabel.toUpperCase();
    ctx.font = "700 22px system-ui, -apple-system, sans-serif";
    const badgeWidth = ctx.measureText(badge).width + 44;
    const badgeX = (CARD_WIDTH - badgeWidth) / 2;
    ctx.fillStyle = styleAccent;
    ctx.beginPath();
    ctx.moveTo(badgeX + 20, 18);
    ctx.arcTo(badgeX + badgeWidth, 18, badgeX + badgeWidth, 58, 20);
    ctx.arcTo(badgeX + badgeWidth, 58, badgeX, 58, 20);
    ctx.arcTo(badgeX, 58, badgeX, 18, 20);
    ctx.arcTo(badgeX, 18, badgeX + badgeWidth, 18, 20);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#09090b";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(badge, CARD_WIDTH / 2, 39);
    ctx.textBaseline = "alphabetic";
  }

  ctx.font = "600 22px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "#6b7280";
  ctx.fillText(isUplifting ? "UPLIFTED BY" : "ROASTED BY", CARD_WIDTH / 2, CARD_HEIGHT - 102);

  ctx.font = "bold 42px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = isUplifting ? "#10b981" : styleAccent;
  if (isUplifting) {
    ctx.shadowColor = "#10b981";
    ctx.shadowBlur = 16;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }
  ctx.fillText("SAUCY GROK", CARD_WIDTH / 2, CARD_HEIGHT - 62);
  ctx.shadowBlur = 0;
  ctx.shadowColor = "transparent";

  ctx.font = "500 20px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "#9ca3af";
  ctx.textAlign = "center";
  ctx.fillText("Try 3 free roasts · roastly-app.vercel.app/share", CARD_WIDTH / 2, CARD_HEIGHT - 28);

  return canvas.toDataURL("image/jpeg", 0.88);
}

// Shared utility to generate the branded 1080x1920 roast card PNG (used for downloads and for direct "Post to X" as brand).
// This bakes the photo + roast text + halo (for uplifting) + Saucy Grok branding + red R CTA into one shareable image.

export async function generateRoastCardImage(
  imageUrl: string,
  roastText: string,
  isUplifting = false
): Promise<string> {
  const CARD_WIDTH = 1080;
  const CARD_HEIGHT = 1920;

  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not get canvas context');

  // Dark background (zinc-950)
  ctx.fillStyle = '#09090b';
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // Load the original photo
  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load image for card'));
    img.src = imageUrl;
  });

  // Photo area: large but leave room for bold, readable roast text below
  const photoMaxWidth = 900;
  const photoMaxHeight = 880;
  const borderWidth = 12;

  let photoWidth = img.width;
  let photoHeight = img.height;

  // Fit while maintaining aspect (cover style)
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
  const photoY = 30; // top padding for photo - larger photo area

  // Halo / glow for uplifting mode (soft positive aura around the photo)
  if (isUplifting) {
    ctx.save();
    const haloPadding = 35;
    ctx.shadowColor = '#10b981'; // emerald-500
    ctx.shadowBlur = 80;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = 'rgba(16, 185, 129, 0.18)';
    ctx.fillRect(
      photoX - haloPadding,
      photoY - haloPadding,
      photoWidth + borderWidth * 2 + haloPadding * 2,
      photoHeight + borderWidth * 2 + haloPadding * 2
    );
    // inner softer layer for nicer halo
    ctx.shadowBlur = 40;
    ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
    ctx.fillRect(
      photoX - haloPadding / 2,
      photoY - haloPadding / 2,
      photoWidth + borderWidth * 2 + haloPadding,
      photoHeight + borderWidth * 2 + haloPadding
    );
    ctx.restore();
  }

  // Draw border (darker)
  ctx.fillStyle = isUplifting ? '#064e3b' : '#1f2937'; // darker for roast, deep emerald tint for uplift
  ctx.fillRect(photoX, photoY, photoWidth + borderWidth * 2, photoHeight + borderWidth * 2);

  // Draw the photo using "cover" style (fill the box, crop if needed) to match the preview look
  const destWidth = photoWidth;
  const destHeight = photoHeight;
  const destX = photoX + borderWidth;
  const destY = photoY + borderWidth;

  // Calculate source rect to cover the destination exactly (like object-cover)
  const imgAspect = img.width / img.height;
  const destAspect = destWidth / destHeight;

  let sourceX, sourceY, sourceWidth, sourceHeight;

  if (imgAspect > destAspect) {
    // Image is wider than box - crop sides
    sourceHeight = img.height;
    sourceWidth = sourceHeight * destAspect;
    sourceX = (img.width - sourceWidth) / 2;
    sourceY = 0;
  } else {
    // Image is taller than box - crop top/bottom
    sourceWidth = img.width;
    sourceHeight = sourceWidth / destAspect;
    sourceX = 0;
    sourceY = (img.height - sourceHeight) / 2;
  }

  ctx.drawImage(
    img,
    sourceX, sourceY, sourceWidth, sourceHeight,
    destX, destY, destWidth, destHeight
  );

  // Roast text area — pick the LARGEST font that fits so short roasts feel bold on the card
  const textAreaTop = photoY + photoHeight + borderWidth * 2 + 24;
  const textAreaBottom = CARD_HEIGHT - 140; // clear space above branding
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
      let currentLine = '';
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

  // Scale UP from min — pick the biggest size that still fits (short roasts get huge type)
  for (let testSize = maxFontSize; testSize >= minFontSize; testSize -= 2) {
    const testFont = `700 ${testSize}px ${fontFamily}`;
    const testLines = wrapText(roastText, testFont, maxTextWidth);
    const testLineHeight = testSize * 1.32;
    const needed = testLines.length * testLineHeight;
    if (needed <= maxAvailableHeight) {
      fontSize = testSize;
      lines = testLines;
      lineHeight = testLineHeight;
      break;
    }
  }

  // Fallback wrap at minimum size if nothing fit
  if (lines.length === 0) {
    fontSize = minFontSize;
    lineHeight = fontSize * 1.32;
    lines = wrapText(roastText, `700 ${fontSize}px ${fontFamily}`, maxTextWidth);
  }

  // If still too tall at min font, tighten line spacing instead of shrinking text further
  let effectiveLineHeight = lineHeight;
  const neededHeight = lines.length * lineHeight;
  if (neededHeight > maxAvailableHeight) {
    effectiveLineHeight = maxAvailableHeight / lines.length;
  }

  // Center the entire text block vertically in the available space
  const totalHeight = lines.length * effectiveLineHeight;
  let y = textAreaTop + (maxAvailableHeight - totalHeight) / 2;

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.font = `700 ${fontSize}px ${fontFamily}`;

  for (const line of lines) {
    ctx.fillText(line, CARD_WIDTH / 2, y);
    y += effectiveLineHeight;
  }

  // Branding at bottom (compressed to maximize photo size)
  ctx.font = '600 22px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#6b7280'; // zinc-500
  ctx.fillText(isUplifting ? 'UPLIFTED BY' : 'ROASTED BY', CARD_WIDTH / 2, CARD_HEIGHT - 95);

  ctx.font = `bold 42px system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = isUplifting ? '#10b981' : '#ef4444'; // emerald or red
  if (isUplifting) {
    ctx.shadowColor = '#10b981';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }
  ctx.fillText('SAUCY GROK', CARD_WIDTH / 2, CARD_HEIGHT - 58);
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';

  // Branded CTA baked into every card for organic virality.
  // Strong, clean, non-spammy — encourages tagging friends + going to site.
  const ctaY = CARD_HEIGHT - 36;
  const domainY = CARD_HEIGHT - 24;
  const ctaText = 'roast anything • roastly-app.vercel.app';
  const domainText = 'roastly-app.vercel.app';

  const cx = CARD_WIDTH / 2;

  // Subtle red dot accent
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(cx - 138, ctaY - 1, 5, 0, Math.PI * 2);
  ctx.fill();

  // Main CTA line
  ctx.font = '500 20px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#6b7280';
  ctx.textAlign = 'center';
  ctx.fillText(ctaText, cx, ctaY);

  // Domain (clear, tappable-looking when shared on stories/X)
  ctx.font = '500 15px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#4b5563';
  ctx.fillText(domainText, cx, domainY);

  return canvas.toDataURL('image/png', 0.95);
}

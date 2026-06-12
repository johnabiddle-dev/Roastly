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

  const SITE_URL = 'https://roastly-app.vercel.app';

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

  // Photo area: centered, with border, similar to DOM
  const photoMaxWidth = 700;
  const photoMaxHeight = 700;
  const borderWidth = 24;

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
  const photoY = 140;

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

  // Draw the photo (cover)
  const sx = 0;
  const sy = 0;
  ctx.drawImage(img, sx, sy, img.width, img.height, photoX + borderWidth, photoY + borderWidth, photoWidth, photoHeight);

  // Roast text area
  const textStartY = photoY + photoHeight + borderWidth * 2 + 80;
  const maxTextWidth = CARD_WIDTH - 160;
  const fontSize = 52;
  ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';

  // Simple text wrapping
  const words = roastText.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxTextWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  let y = textStartY;
  const lineHeight = fontSize * 1.35;
  for (const line of lines) {
    ctx.fillText(line, CARD_WIDTH / 2, y);
    y += lineHeight;
  }

  // Branding at bottom
  ctx.font = '600 28px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#6b7280'; // zinc-500
  ctx.fillText(isUplifting ? 'UPLIFTED BY' : 'ROASTED BY', CARD_WIDTH / 2, CARD_HEIGHT - 160);

  ctx.font = `bold 52px system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = isUplifting ? '#10b981' : '#ef4444'; // emerald or red
  if (isUplifting) {
    ctx.shadowColor = '#10b981';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }
  ctx.fillText('SAUCY GROK', CARD_WIDTH / 2, CARD_HEIGHT - 100);
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';

  // Branded CTA at the very bottom of the exported PNG (baked into every shareable card).
  // Red Roasty icon (R badge) + strong call-to-action to drive more users.
  // The domain is shown smaller below so the link is buried for promotion.
  const ctaY = CARD_HEIGHT - 58;
  const domainY = CARD_HEIGHT - 36;
  const ctaText = 'roast your friends too';
  const domainText = SITE_URL.replace('https://', '');

  ctx.font = '400 22px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#4b5563';
  const textW = ctx.measureText(ctaText).width;
  const cx = CARD_WIDTH / 2;
  const iconR = 8;
  const iconX = cx - textW / 2 - iconR - 8;

  // Red Roasty badge icon (next to CTA)
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(iconX, ctaY - 1, iconR, 0, Math.PI * 2);
  ctx.fill();

  // White R inside icon
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('R', iconX, ctaY + 3);

  // CTA text
  ctx.font = '400 22px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#4b5563';
  ctx.textAlign = 'center';
  ctx.fillText(ctaText, cx, ctaY);

  // Domain (smaller, for discoverability when shared)
  ctx.font = '400 16px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#4b5563';
  ctx.textAlign = 'center';
  ctx.fillText(domainText, cx, domainY);

  // Subtle underline to hint that the domain is a link (even though it's a static PNG)
  const domainW = ctx.measureText(domainText).width;
  ctx.strokeStyle = '#4b5563';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - domainW / 2, domainY + 4);
  ctx.lineTo(cx + domainW / 2, domainY + 4);
  ctx.stroke();

  return canvas.toDataURL('image/png', 0.95);
}

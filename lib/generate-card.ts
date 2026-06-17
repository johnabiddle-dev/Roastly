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

  // Roast text area — respect explicit \n from model + smart wrap
  const textStartY = photoY + photoHeight + borderWidth * 2 + 72;
  const maxTextWidth = CARD_WIDTH - 140;
  const fontSize = 50;
  ctx.font = `700 ${fontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';

  // Split on explicit newlines first (model often returns "line1\\nline2")
  const rawLines = roastText.split(/\n|\\n/);
  const lines: string[] = [];

  for (const raw of rawLines) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    // Word wrap each segment
    const words = trimmed.split(/\s+/);
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
  }

  // Limit to 4 lines visually for card beauty
  const displayLines = lines.slice(0, 4);

  let y = textStartY;
  const lineHeight = fontSize * 1.38;
  for (const line of displayLines) {
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

  // Branded CTA baked into every card for organic virality.
  // Strong, clean, non-spammy — encourages tagging friends + going to site.
  const ctaY = CARD_HEIGHT - 62;
  const domainY = CARD_HEIGHT - 38;
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

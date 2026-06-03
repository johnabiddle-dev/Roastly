'use client';

import { useRef } from 'react';

interface RoastCardProps {
  imageUrl: string;
  roastText: string;
  isUplifting?: boolean;
  onClose?: () => void;
}

export default function RoastCard({ imageUrl, roastText, isUplifting = false, onClose }: RoastCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const SITE_URL = 'https://roastly-app.vercel.app';

  // Generate the card image using canvas for maximum reliability (especially the photo on mobile)
  const generateCardImage = async (): Promise<string> => {
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
    // Red Roasty icon (R badge) + "click here to roast back" call-to-action.
    // The actual domain is shown smaller below so the link is still buried for promotion
    // when the image is shared (and looks special thanks to the custom icon).
    const ctaY = CARD_HEIGHT - 58;
    const domainY = CARD_HEIGHT - 36;
    const ctaText = 'click here to roast back';
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
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;

    try {
      // Generate via canvas for reliable photo inclusion (fixes mobile capture issues)
      const dataUrl = await generateCardImage();

      // Convert to File for share API
      const arr = dataUrl.split(',');
      const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const file = new File([u8arr], 'roasted.png', { type: mime });

      const shareText = `${roastText}\n\n👉 Click here to roast back: ${SITE_URL}`;

      // Prefer native share sheet on mobile (Save to Photos is easy)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: isUplifting ? 'Uplifted by Saucy Grok' : 'Roasted by Saucy Grok',
          text: shareText,
        });
      } else {
        const link = document.createElement('a');
        link.download = 'roasted.png';
        link.href = dataUrl;
        link.click();

        // On desktop / when share sheet isn't available, also copy the real link
        // so the user can paste it somewhere (the image itself is just pixels).
        try {
          await navigator.clipboard.writeText(SITE_URL);
          alert('Image downloaded as roasted.png.\n\nThe link was also copied to your clipboard:\n' + SITE_URL);
        } catch {
          // Clipboard may be blocked; still let them know the link
          alert('Image downloaded as roasted.png.\n\nVisit ' + SITE_URL + ' to roast back.');
        }
      }
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        console.error('Failed to generate image:', error);
        alert('Something went wrong while creating the image. Try again.');
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-3xl max-w-2xl w-full overflow-hidden">
        {/* Card Preview */}
        <div 
          ref={cardRef}
          className="bg-zinc-950 p-8 flex flex-col items-center"
          style={{ 
            aspectRatio: '9/16', // Good for sharing in chats (portrait)
            maxHeight: '70vh'
          }}
        >
          {/* Photo */}
          <div className={`w-full max-w-[320px] rounded-2xl overflow-hidden mb-6 border-4 ${isUplifting ? "border-emerald-600" : "border-zinc-800"}`} style={isUplifting ? { boxShadow: "0 0 25px rgba(16,185,129,0.35), 0 0 50px rgba(16,185,129,0.15)" } : {}}>
            <img 
              src={imageUrl} 
              alt="Roasted" 
              className="w-full h-auto object-cover"
            />
          </div>

          {/* Roast Text */}
          <div className="text-center px-4">
            <p className="text-white text-xl md:text-2xl font-semibold leading-tight tracking-tight">
              {roastText}
            </p>
          </div>

          {/* Branding */}
          <div className="mt-auto pt-8 text-center">
            <p className="text-xs text-zinc-500 tracking-[3px]">{isUplifting ? 'UPLIFTED BY' : 'ROASTED BY'}</p>
            <p className={`${isUplifting ? "text-emerald-500" : "text-red-500"} font-bold text-lg -mt-1`}>SAUCY GROK</p>
            <p className="text-[10px] text-zinc-500 mt-1 tracking-normal">click here to roast back</p>
            <p className="text-[9px] text-zinc-600 tracking-normal">roastly-app.vercel.app</p>
          </div>
        </div>

        {/* Controls */}
        <div className="p-6 flex gap-4 bg-zinc-900">
          <button
            onClick={onClose}
            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-2xl font-semibold transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleDownload}
            className="flex-1 bg-red-600 hover:bg-red-500 text-white py-3 rounded-2xl font-semibold transition-colors"
          >
            Download Image
          </button>
        </div>

        {/* Separate easy way to get the live link (the text in the image is just pixels) */}
        <div className="bg-zinc-900 pb-5 text-center">
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(SITE_URL);
                alert('Link copied to clipboard!\n' + SITE_URL);
              } catch {
                // Fallback for strict browsers
                window.prompt('Copy this link:', SITE_URL);
              }
            }}
            className="text-xs text-zinc-400 hover:text-zinc-200 underline active:text-white"
          >
            Copy link to roast back
          </button>
        </div>
      </div>
    </div>
  );
}

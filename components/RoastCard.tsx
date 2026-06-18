'use client';

import { useRef } from 'react';
import { generateRoastCardImage } from '@/lib/generate-card';

interface RoastCardProps {
  imageUrl: string;
  roastText: string;
  isUplifting?: boolean;
  onClose?: () => void;
  onPostToX?: () => void;
  isOwner?: boolean;
}

export default function RoastCard({ imageUrl, roastText, isUplifting = false, onClose, onPostToX, isOwner = false }: RoastCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const SITE_URL = 'https://roastly-app.vercel.app';

  const handleDownload = async () => {
    if (!cardRef.current) return;

    try {
      const dataUrl = await generateRoastCardImage(imageUrl, roastText, isUplifting);

      const arr = dataUrl.split(',');
      const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const file = new File([u8arr], 'roasted.png', { type: mime });

      // Short, clean share text (roast lives in the beautiful image)
      const shareText = `Saucy Grok just destroyed this 😂🔥\n\nRoast anything — screenshots, photos, texts, memes.\n${SITE_URL}\n\n#Roastly #Grok #AI`;

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

        try {
          await navigator.clipboard.writeText(SITE_URL);
          alert('Downloaded. Link also copied.');
        } catch {
          alert('Card saved as roasted.png');
        }
      }
    } catch (error: unknown) {
      const err = error as { name?: string };
      if (err?.name !== 'AbortError') {
        console.error('Failed to generate image:', error);
        alert('Something went wrong while creating the image. Try again.');
      }
    }
  };

  // Viral-optimized caption for X. Includes the roast + strong hooks + hashtags.
  const copyPerfectCaption = async () => {
    const shortRoast = roastText.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);
    const caption = `${shortRoast}\n\nRoasted by Saucy Grok 🔥\nRoast anything (screenshots, photos, convos, anything).\n${SITE_URL}\n\nTag someone who needs this 👀 #Roastly #Grok #AI #Roast`;
    try {
      await navigator.clipboard.writeText(caption);
      alert('Caption copied! Paste + attach the card image on X.');
    } catch {
      window.prompt('Copy this caption:', caption);
    }
  };

  const handleSubmitToBrand = () => {
    // Pre-fills a strong X post. User attaches the downloaded card image.
    const tweetText = `${roastText}\n\nRoasted by Saucy Grok 🔥\n${SITE_URL}\n\n#Roastly #Grok #AI #Roast`;

    navigator.clipboard.writeText(roastText).catch(() => {});
    window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(tweetText)}`, '_blank');

    alert('Roast copied. Attach the downloaded card image and tag @roastlyapp if you want it featured.');
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-3xl max-w-2xl w-full overflow-hidden">
        {/* Card Preview - tighter on mobile, closer match to exported card */}
        <div 
          ref={cardRef}
          className="bg-zinc-950 p-5 sm:p-8 flex flex-col items-center"
          style={{ 
            aspectRatio: '9/16',
            maxHeight: '68vh'
          }}
        >
          {/* Photo */}
          <div className={`w-full max-w-[300px] sm:max-w-[320px] rounded-2xl overflow-hidden mb-4 sm:mb-6 border-4 ${isUplifting ? "border-emerald-600" : "border-zinc-800"}`} style={isUplifting ? { boxShadow: "0 0 20px rgba(16,185,129,0.3)" } : {}}>
            <img 
              src={imageUrl} 
              alt="Roasted" 
              className="w-full h-auto object-cover"
            />
          </div>

          {/* Roast Text - respects \n like the exported card */}
          <div className="text-center px-3 whitespace-pre-line">
            <p className="text-white text-[17px] sm:text-xl md:text-2xl font-semibold leading-tight tracking-tight">
              {roastText}
            </p>
          </div>

          {/* Branding */}
          <div className="mt-auto pt-6 sm:pt-8 text-center">
            <p className="text-[10px] text-zinc-500 tracking-[2px]">{isUplifting ? 'UPLIFTED BY' : 'ROASTED BY'}</p>
            <p className={`${isUplifting ? "text-emerald-500" : "text-red-500"} font-bold text-base sm:text-lg -mt-0.5`}>SAUCY GROK</p>
            <p className="text-[9px] text-zinc-500 mt-0.5">roastly-app.vercel.app</p>
          </div>
        </div>

        {/* Controls - mobile optimized: 2-col grid on phones, row on larger */}
        <div className="p-3 sm:p-4 grid grid-cols-2 sm:flex sm:flex-row gap-2 sm:gap-3 bg-zinc-900">
          <button
            onClick={onClose}
            className="min-h-[44px] bg-zinc-800 active:bg-zinc-700 text-white py-2.5 rounded-2xl font-semibold transition-colors text-sm touch-manipulation"
          >
            Close
          </button>
          <button
            onClick={handleDownload}
            className="min-h-[44px] bg-red-600 active:bg-red-700 text-white py-2.5 rounded-2xl font-semibold transition-colors text-sm touch-manipulation"
          >
            Download Card
          </button>

          <button
            onClick={copyPerfectCaption}
            className="min-h-[44px] bg-emerald-600 active:bg-emerald-500 text-white py-2.5 rounded-2xl font-semibold transition-colors text-sm touch-manipulation"
          >
            Copy caption
          </button>

          <button
            onClick={handleSubmitToBrand}
            className="min-h-[44px] bg-zinc-700 active:bg-zinc-600 text-white py-2.5 rounded-2xl font-semibold transition-colors text-sm touch-manipulation"
          >
            Send to @roastlyapp
          </button>

          {isOwner && onPostToX && (
            <button
              onClick={onPostToX}
              className="col-span-2 sm:col-span-1 min-h-[44px] bg-sky-600 active:bg-sky-500 text-white py-2.5 rounded-2xl font-semibold transition-colors text-sm touch-manipulation"
            >
              Post to X @roastlyapp
            </button>
          )}
        </div>

        {/* Link hint */}
        <div className="bg-zinc-900 pb-4 sm:pb-5 text-center">
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(SITE_URL);
                alert('Link copied: ' + SITE_URL);
              } catch {
                window.prompt('Copy link:', SITE_URL);
              }
            }}
            className="text-xs text-zinc-400 hover:text-zinc-200 underline active:text-white min-h-[44px] px-2 touch-manipulation"
          >
            Copy roastly link
          </button>
        </div>
      </div>
    </div>
  );
}

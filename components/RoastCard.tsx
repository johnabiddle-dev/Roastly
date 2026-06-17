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

  // Use shared generator (ensures downloads and X posts always use identical branded card)
  const generateCardImage = async (): Promise<string> => {
    return generateRoastCardImage(imageUrl, roastText, isUplifting);
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;

    try {
      const dataUrl = await generateCardImage();

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
          alert('Card downloaded as roasted.png.\nLink copied too — send it with the image.');
        } catch {
          alert('Card downloaded as roasted.png.\n' + SITE_URL);
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

  // Best-in-class pre-filled caption for X, IG Stories, TikTok, group chats.
  // Includes the actual roast text (short) + natural hook + branding + hashtags.
  const copyPerfectCaption = async () => {
    const shortRoast = roastText.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 180);
    const caption = `${shortRoast}\n\nRoasted by Saucy Grok 🔥\nRoast anything — photos, texts, X posts, memes.\n${SITE_URL}\n\nTag who needs this 👀\n#Roastly #Grok #AI #Roast`;
    try {
      await navigator.clipboard.writeText(caption);
      alert('Perfect share caption copied!\nPaste + attach your downloaded card image on X, IG, or wherever.');
    } catch {
      window.prompt('Copy this caption:', caption);
    }
  };

  const handleSubmitToBrand = () => {
    // Users download the beautiful card then post to X tagging @roastlyapp.
    // This fuels organic content + possible reposts.
    const tweetText = `${roastText}\n\nRoasted by Saucy Grok 🔥\n${SITE_URL}\n\n#Roastly #Grok #AI`;

    navigator.clipboard.writeText(roastText).catch(() => {});
    window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(tweetText)}`, '_blank');

    alert(
      'Roast copied.\n\nDownload the card PNG first, then attach it in the X post that opened.\nTag @roastlyapp to get featured.'
    );
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
        <div className="p-4 sm:p-6 flex flex-col sm:flex-row gap-3 sm:gap-4 bg-zinc-900">
          <button
            onClick={onClose}
            className="flex-1 min-h-[48px] bg-zinc-800 active:bg-zinc-700 text-white py-3 rounded-2xl font-semibold transition-colors text-sm sm:text-base"
          >
            Close
          </button>
          <button
            onClick={handleDownload}
            className="flex-1 min-h-[48px] bg-red-600 active:bg-red-700 text-white py-3 rounded-2xl font-semibold transition-colors text-sm sm:text-base"
          >
            Download Card
          </button>

          <button
            onClick={copyPerfectCaption}
            className="flex-1 min-h-[48px] bg-emerald-600 active:bg-emerald-500 text-white py-3 rounded-2xl font-semibold transition-colors text-sm sm:text-base"
          >
            Copy caption for X / IG
          </button>

          <button
            onClick={handleSubmitToBrand}
            className="flex-1 min-h-[48px] bg-zinc-700 active:bg-zinc-600 text-white py-3 rounded-2xl font-semibold transition-colors text-sm sm:text-base"
          >
            Send to @roastlyapp
          </button>
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

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

      // Only send a short CTA + link in the share text.
      // The roast itself is already visually in the image (the card).
      // This prevents the share sheet from creating a duplicate "regular text message"
      // that repeats the roast text.
      const shareText = `Saucy Grok just roasted my screenshot with the meanest Crispy roast 😂🔥\n\nUpload any photo, convo, meme — get 5 options and a shareable card. Free to try:\n${SITE_URL}\n\nFollow @roastlyapp — daily throat-rippers. Tag someone who needs this. #Roastly #Grok #AI`;

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
    } catch (error: unknown) {
      const err = error as { name?: string };
      if (err?.name !== 'AbortError') {
        console.error('Failed to generate image:', error);
        alert('Something went wrong while creating the image. Try again.');
      }
    }
  };

  const handleSubmitToBrand = () => {
    // Pre-fill a post with the roast text + strong CTA + link.
    // User attaches the downloaded card PNG (their photo + the roast baked in).
    // This is the easiest way for users to "send" the picture they created to @roastlyapp
    // so the owner sees it and can repost/engage for more X reach.
    const tweetText = `${roastText}\n\nRoasted (or uplifted) by Saucy Grok 🔥 Try it yourself:\n${SITE_URL}\n\n#Roastly #Grok #AI`;

    navigator.clipboard.writeText(roastText).catch(() => {});
    window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(tweetText)}`, '_blank');

    alert(
      'Roast text copied to clipboard!\n\n' +
      '1. Make sure you downloaded the card image (the big PNG with your photo + this text).\n' +
      '2. In the X composer that just opened, attach the PNG you downloaded.\n' +
      '3. Post it (tag @roastlyapp if you want the owner to see and possibly repost it).\n\n' +
      'Thanks — this is the easiest way for the app to get your created pictures in front of us for X content!'
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
            Download Image
          </button>

          <button
            onClick={handleSubmitToBrand}
            className="flex-1 min-h-[48px] bg-zinc-700 active:bg-zinc-600 text-white py-3 rounded-2xl font-semibold transition-colors text-sm sm:text-base"
          >
            Send card to @roastlyapp
          </button>

          {isOwner && onPostToX && (
            <button
              onClick={onPostToX}
              className="flex-1 min-h-[48px] bg-zinc-700 active:bg-zinc-600 text-white py-3 rounded-2xl font-semibold transition-colors text-sm sm:text-base"
            >
              Post to X
            </button>
          )}
        </div>

        {/* Separate easy way to get the live link (the text in the image is just pixels) */}
        <div className="bg-zinc-900 pb-4 sm:pb-5 text-center">
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
            className="text-xs text-zinc-400 hover:text-zinc-200 underline active:text-white min-h-[44px] px-2 touch-manipulation"
          >
            Copy link to roast back
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useRef } from 'react';
import { toPng } from 'html-to-image';

interface RoastCardProps {
  imageUrl: string;
  roastText: string;
  onClose?: () => void;
}

export default function RoastCard({ imageUrl, roastText, onClose }: RoastCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    if (!cardRef.current) return;

    try {
      const dataUrl = await toPng(cardRef.current, {
        quality: 0.95,
        pixelRatio: 2, // Higher quality
      });

      const link = document.createElement('a');
      link.download = 'roasted.png';
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Failed to generate image:', error);
      alert('Something went wrong while creating the image. Try again.');
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
          <div className="w-full max-w-[320px] rounded-2xl overflow-hidden border-4 border-zinc-800 mb-6">
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
            <p className="text-xs text-zinc-500 tracking-[3px]">ROASTED BY</p>
            <p className="text-red-500 font-bold text-lg -mt-1">SAUCY GROK</p>
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
      </div>
    </div>
  );
}

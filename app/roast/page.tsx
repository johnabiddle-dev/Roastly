'use client';

import { useState, useEffect } from 'react';
import RoastCard from '@/components/RoastCard';

export default function RoastPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [roasts, setRoasts] = useState<string[]>([]);
  const [showCard, setShowCard] = useState(false);
  const [selectedRoastForCard, setSelectedRoastForCard] = useState('');
  const [vibe, setVibe] = useState<'brutal' | 'unhinged' | 'savage' | 'playful' | 'mild'>('brutal');
  const [usage, setUsage] = useState<{ used: number; remaining: number; limit: number; isPaid: boolean } | null>(null);

  const getOrCreateBrowserId = () => {
    if (typeof window === "undefined") return "server";
    let id = localStorage.getItem("roastly-browser-id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("roastly-browser-id", id);
    }
    return id;
  };

  const fetchUsage = async () => {
    try {
      const res = await fetch("/api/usage", {
        headers: {
          "x-roastly-browser-id": getOrCreateBrowserId(),
        },
      });
      const data = await res.json();
      setUsage(data);
    } catch (e) {
      console.error("Failed to fetch usage", e);
    }
  };

  // Fetch usage when component loads
  useEffect(() => {
    fetchUsage();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviewUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGetRoasted = async () => {
    if (!selectedFile) return;

    setIsGenerating(true);

    try {
      // Convert image to base64
      const base64 = await fileToBase64(selectedFile);

      const response = await fetch("/api/generate-roast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-roastly-browser-id": getOrCreateBrowserId(),
        },
        body: JSON.stringify({
          imageBase64: base64,
          vibe: vibe,
        }),
      });

      const data = await response.json();

      if (data.error) {
        alert(data.error);
      } else if (data.roasts && data.roasts.length > 0) {
        setRoasts(data.roasts);
        // Server already consumed one roast (enforced in /api/generate-roast). Refresh display count.
        await fetchUsage();
      } else {
        alert("No roasts were generated. Try again.");
      }
    } catch (error) {
      console.error(error);
      alert("Something went wrong while generating roasts.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Helper to convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data:image/...;base64, prefix
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setRoasts([]);
    setUsage(null);
  };

  const handleRegenerate = () => {
    setRoasts([]);
    handleGetRoasted();
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold tracking-tighter mb-4">
            Let's do this.
          </h1>
          <p className="text-xl text-zinc-400">
            Upload a photo and get roasted by AI
          </p>
        </div>

        {/* Results View */}
        {roasts.length > 0 && previewUrl ? (
          <div className="space-y-8">
            <div className="mx-auto max-w-md">
              <img 
                src={previewUrl} 
                alt="Your photo" 
                className="w-full rounded-3xl shadow-2xl mb-8"
              />
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-4 text-center">Saucy Grok says...</h2>
              <div className="space-y-4">
                {roasts.map((roast, index) => (
                  <div 
                    key={index} 
                    className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-lg"
                  >
                    {roast}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <div className="text-sm text-zinc-400 self-center">
                {usage 
                  ? usage.isPaid 
                    ? `${usage.remaining} roasts left today` 
                    : `${usage.remaining} free roasts remaining`
                  : ""}
              </div>
              <button
                onClick={handleRegenerate}
                disabled={isGenerating}
                className="bg-red-600 hover:bg-red-500 disabled:bg-zinc-700 px-8 py-3 rounded-2xl font-semibold transition-colors"
              >
                {isGenerating ? "Generating..." : "Regenerate Roasts"}
              </button>
              <button
                onClick={() => {
                  setSelectedRoastForCard(roasts[0]);
                  setShowCard(true);
                }}
                className="bg-white text-black hover:bg-zinc-200 px-8 py-3 rounded-2xl font-semibold transition-colors"
              >
                Create Shareable Card
              </button>
              <button
                onClick={resetUpload}
                className="bg-zinc-800 hover:bg-zinc-700 px-8 py-3 rounded-2xl font-semibold transition-colors"
              >
                Upload Different Photo
              </button>
            </div>
          </div>
        ) : !previewUrl ? (
          /* Upload Area */
          <div className="border-2 border-dashed border-zinc-700 rounded-3xl p-12 text-center hover:border-zinc-500 transition-colors">
            <div className="mx-auto w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v-4m0 0V8m0 4h16m-8-4v8m-4 4h8" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Upload a photo</h3>
            <p className="text-zinc-400 mb-6">Selfies, group photos, outfits — anything roastable</p>
            
            <label className="inline-block bg-white text-black px-8 py-3 rounded-2xl font-semibold cursor-pointer hover:bg-zinc-200 transition-colors">
              Choose Photo
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleFileSelect}
                className="hidden" 
              />
            </label>
          </div>
        ) : (
          /* Preview + Generate Button */
          <div className="space-y-8">
            <div className="relative mx-auto max-w-md">
              <img 
                src={previewUrl} 
                alt="Preview" 
                className="w-full rounded-3xl shadow-2xl"
              />
              <button 
                onClick={resetUpload}
                className="absolute top-4 right-4 bg-black/70 text-white px-4 py-1 rounded-full text-sm hover:bg-black"
              >
                Change photo
              </button>
            </div>

            <div className="space-y-6">
              {/* Vibe Selector */}
              <div>
                <p className="text-sm text-zinc-400 mb-3 text-center">Choose the vibe</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {[
                    { value: 'brutal', label: 'Brutal' },
                    { value: 'unhinged', label: 'Unhinged' },
                    { value: 'savage', label: 'Savage' },
                    { value: 'playful', label: 'Playful' },
                    { value: 'mild', label: 'Mild' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setVibe(option.value as any)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        vibe === option.value
                          ? 'bg-red-600 text-white'
                          : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-center">
                <button
                  onClick={handleGetRoasted}
                  disabled={isGenerating || Boolean(usage && usage.remaining <= 0)}
                  className="bg-red-600 hover:bg-red-500 disabled:bg-zinc-700 transition-colors text-white text-xl font-semibold px-12 py-4 rounded-2xl"
                >
                  {usage && usage.remaining <= 0 
                    ? (usage.isPaid ? "Daily limit reached" : "Free limit reached")
                    : isGenerating 
                      ? "Generating roasts..." 
                      : "Get Roasted →"}
                </button>
                <p className="text-xs text-zinc-500 mt-3">
                  {usage 
                    ? usage.isPaid 
                      ? `${usage.remaining} roasts left today` 
                      : `${usage.remaining} free roasts remaining (3 total)`
                    : "Loading limit..."}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Roast Card Modal */}
      {showCard && previewUrl && selectedRoastForCard && (
        <RoastCard
          imageUrl={previewUrl}
          roastText={selectedRoastForCard}
          onClose={() => setShowCard(false)}
        />
      )}
    </div>
  );
}

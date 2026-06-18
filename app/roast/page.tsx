'use client';

import { useState, useEffect } from 'react';
import RoastCard from '@/components/RoastCard';
import { STRIPE_PRICES } from '@/lib/stripe';
import { generateRoastCardImage } from '@/lib/generate-card';
import { USAGE_VERSION } from '@/lib/usage';

export default function RoastPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingMessage, setGeneratingMessage] = useState('');
  const [roasts, setRoasts] = useState<string[]>([]);
  const [showCard, setShowCard] = useState(false);
  const [selectedRoastForCard, setSelectedRoastForCard] = useState('');
  const [vibe, setVibe] = useState<'crispy' | 'medium_rare' | 'light_toast' | 'uplifting'>('crispy');
  const [customPrompt, setCustomPrompt] = useState('');
  const [usage, setUsage] = useState<{ used: number; remaining: number; limit: number; isPaid: boolean; hasCustomPrompts?: boolean; bonusRoasts?: number; referredBy?: string } | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const [isCheckingOut, setIsCheckingOut] = useState<string | null>(null);

  const getOrCreateBrowserId = () => {
    if (typeof window === "undefined") return "server";
    let id = localStorage.getItem("roastly-browser-id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("roastly-browser-id", id);
    }
    return id;
  };

  const [error, setError] = useState('');

  // No public reset mechanisms for security. Owner uses OWNER_BROWSER_ID env var for unlimited access.

  // Client-side free limit tracking (survives serverless). Bumped via USAGE_VERSION to reset globally.
  const getClientFreeUsed = (browserId: string): number => {
    if (typeof window === "undefined") return 0;
    const key = `roastly-${USAGE_VERSION}-free-used-${browserId}`;
    return parseInt(localStorage.getItem(key) || "0", 10);
  };

  const setClientFreeUsed = (browserId: string, used: number) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(`roastly-${USAGE_VERSION}-free-used-${browserId}`, String(used));
  };

  // Resize and convert image to JPEG base64 for reliable sending (especially from mobile/HEIC)
  const resizeAndConvertToBase64 = (file: File, maxSize = 1024): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > maxSize || height > maxSize) {
            if (width > height) {
              height = Math.round(height * (maxSize / width));
              width = maxSize;
            } else {
              width = Math.round(width * (maxSize / height));
              height = maxSize;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
            const base64 = dataUrl.split(",")[1];
            resolve(base64);
          } else {
            reject(new Error("Canvas context not available"));
          }
        };
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  };

  const fetchUsage = async () => {
    try {
      const headers: Record<string, string> = {
        "x-roastly-browser-id": getOrCreateBrowserId(),
      };
      const storedReferrer = typeof window !== "undefined" ? localStorage.getItem("roastly-referrer") : null;
      if (storedReferrer) {
        headers["x-roastly-referrer"] = storedReferrer;
      }

      const res = await fetch("/api/usage", {
        headers,
      });
      const data = await res.json();
      const browserId = getOrCreateBrowserId();

      if (data && !data.isPaid) {
        const clientUsed = getClientFreeUsed(browserId);
        if (clientUsed > (data.used || 0)) {
          const remaining = Math.max(0, 3 - clientUsed);
          setUsage({
            ...data,
            used: clientUsed,
            remaining,
          });
        } else {
          setClientFreeUsed(browserId, data.used || 0);
          setUsage(data);
        }
      } else {
        setUsage(data);
      }
    } catch (e) {
      console.error("Failed to fetch usage", e);
    }
  };

  // Fetch usage when component loads
  useEffect(() => {
    // Capture referral if present in URL (for growth / getting more users)
    const browserId = getOrCreateBrowserId();
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      const ref = url.searchParams.get("ref");
      if (ref && ref !== browserId) {
        localStorage.setItem("roastly-referrer", ref);
        // clean the URL so it doesn't stay in history
        url.searchParams.delete("ref");
        window.history.replaceState({}, "", url.toString());
      }
    }

    fetchUsage();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setError("");
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
    const messages = [
      "Analyzing every pixel...",
      "Grok is cooking...",
      "Finding the weak spots...",
      "Reading the room (and destroying it)...",
      "Crafting elite burns..."
    ];
    setGeneratingMessage(messages[0]);
    let msgIndex = 0;
    const msgInterval = setInterval(() => {
      msgIndex = (msgIndex + 1) % messages.length;
      setGeneratingMessage(messages[msgIndex]);
    }, 420);

    try {
      setError("");

      const browserId = getOrCreateBrowserId();
      const clientUsed = getClientFreeUsed(browserId);

      if (usage && usage.remaining <= 0) {
        setShowUpgradeModal(true);
        setIsGenerating(false);
        clearInterval(msgInterval);
        setGeneratingMessage('');
        return;
      }

      const base64 = await resizeAndConvertToBase64(selectedFile);

      const response = await fetch("/api/generate-roast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-roastly-browser-id": getOrCreateBrowserId(),
        },
        body: JSON.stringify({
          imageBase64: base64,
          vibe: vibe,
          customPrompt: customPrompt.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else if (data.roasts && data.roasts.length > 0) {
        setRoasts(data.roasts);
        setClientFreeUsed(browserId, clientUsed + 1);
        await fetchUsage();
      } else {
        setError("No roasts were generated. Try again.");
      }
    } catch (error) {
      console.error(error);
      setError("Something went wrong while generating roasts.");
    } finally {
      clearInterval(msgInterval);
      setGeneratingMessage('');
      setIsGenerating(false);
    }
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setRoasts([]);
    setError("");
    setCustomPrompt("");
    // Note: usage refetch happens on next generate
  };

  const handleRegenerate = () => {
    setRoasts([]);
    handleGetRoasted();
  };

  // Post the current roast + the full branded card image directly to X as @roastlyapp
  const postToX = async (roastText: string) => {
    if (!previewUrl) {
      alert("No image available to post.");
      return;
    }

    try {
      // Generate the exact same styled card PNG (photo + roast baked in + branding)
      const cardBase64 = await generateRoastCardImage(previewUrl, roastText, vibe === 'uplifting');

      // High-virality caption for direct brand post on X.
      // Roast text first (the star), then hook + hashtags.
      let postCaption = `${roastText.trim()}\n\nRoast anything with Grok → roastly-app.vercel.app\n\n#Roastly #Grok #AI #Roast`;
      if (postCaption.length > 280) {
        postCaption = postCaption.slice(0, 277) + "...";
      }

      const browserId = getOrCreateBrowserId();
      const res = await fetch("/api/post-to-x", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-roastly-browser-id": browserId,
        },
        body: JSON.stringify({
          text: postCaption,
          imageBase64: cardBase64,
        }),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch (jsonErr) {
        console.error("Failed to parse post-to-x response as JSON:", jsonErr);
      }

      if (res.ok && data.success) {
        alert(`Posted to X! View: ${data.url || "Check your X account"}`);
      } else {
        alert(data.error || `Failed to post to X (status ${res.status}). Make sure X API keys are configured in Vercel.`);
      }
    } catch (e) {
      console.error(e);
      alert("Network or unexpected error posting to X. Check console or X API setup.");
    }
  };

  const copyReferralLink = () => {
    const id = getOrCreateBrowserId();
    const link = `https://roastly-app.vercel.app/roast?ref=${id}`;
    navigator.clipboard.writeText(link);
    alert("Referral link copied. Friends get bonus roasts when they pay.");
  };

  const copyViralXPost = () => {
    const id = getOrCreateBrowserId();
    const link = `https://roastly-app.vercel.app/roast?ref=${id}`;
    const text = `Saucy Grok roasted this 🔥\n\nWorks on anything (screenshots, chats, photos).\n${link}\n\n#Roastly #Grok #AI`;
    navigator.clipboard.writeText(text);
    alert("Viral text copied — paste + attach your card image.");
  };

  // Checkout handler (same pattern as landing page)
  // Small helper to keep usage labels consistent and DRY
  const getUsageLabel = () => {
    if (!usage) return "Loading...";
    if (usage.remaining > 100000) return "Unlimited (owner)";
    if (usage.isPaid) return `${usage.remaining} roasts left today`;
    return `${usage.remaining} free roasts remaining (3 total)`;
  };

  const handleCheckout = async (priceId: string) => {
    if (!priceId) {
      alert("This product isn't set up yet.");
      return;
    }

    const isSubscription = priceId === STRIPE_PRICES.unlimited;
    const productLabel = isSubscription ? "Unlimited Roasts ($19.99/mo)" : 
      priceId === STRIPE_PRICES.starter ? "Starter ($0.99)" :
      priceId === STRIPE_PRICES.popular ? "Popular Pack ($4.99)" :
      priceId === STRIPE_PRICES.heavy ? "Heavy Roaster ($9.99)" :
      priceId === STRIPE_PRICES.firstRoastSpecial ? "First Roast 12 for $0.99" :
      priceId === STRIPE_PRICES.threeRoastSpecial ? "Third Roast 10 for $0.99" :
      "selected pack";

    const confirmMessage = `You are about to purchase the ${productLabel}.` + 
      (isSubscription ? " This will be a recurring monthly charge." : " This is a one-time purchase.") +
      " Do you want to continue?";

    if (!confirm(confirmMessage)) {
      return;
    }

    setIsCheckingOut(priceId);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });

      const data = await res.json();

      if (data.url) {
        setShowUpgradeModal(false);
        window.location.href = data.url;
      } else {
        alert(data.error || "Something went wrong");
      }
    } catch (error) {
      console.error(error);
      alert("Failed to start checkout. Please try again.");
    } finally {
      setIsCheckingOut(null);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold tracking-tighter mb-4">
            Let's do this.
          </h1>
          <p className="text-xl text-zinc-400">
            Upload screenshots, photos, texts, X posts, pets — roast literally anything
          </p>
        </div>

        {/* Results View */}
        {roasts.length > 0 && previewUrl ? (
          <div className="space-y-8">
            <div className="mx-auto max-w-md">
              <img 
                src={previewUrl} 
                alt="Your screenshot or image" 
                className="w-full rounded-3xl shadow-2xl mb-8"
              />
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-4 text-center">
                {vibe === 'uplifting' 
                  ? 'Saucy Grok says something nice...' 
                  : vibe === 'crispy' 
                    ? 'Your Crispy roasts (nuclear edition)' 
                    : vibe === 'medium_rare' 
                      ? 'Your Medium Rare roasts' 
                      : 'Your Light Toast roasts'}
              </h2>
              <div className="space-y-4">
                <p className="text-xs text-zinc-500 text-center mb-2">Tap any roast to create the card. These are built for X — post them.</p>
                {roasts.map((roast, index) => (
                  <div 
                    key={index} 
                    onClick={() => {
                      setSelectedRoastForCard(roast);
                      setShowCard(true);
                    }}
                    className="bg-zinc-900 border border-zinc-800 hover:border-red-600 active:border-red-500 cursor-pointer rounded-2xl p-4 sm:p-5 text-base sm:text-lg min-h-[60px] transition-colors active:bg-zinc-800 touch-manipulation text-center whitespace-pre-line"
                  >
                    {roast}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center pt-4">
              <div className="text-xs sm:text-sm text-zinc-400 self-center text-center sm:text-left">
                {getUsageLabel()}
              </div>
              <button
                onClick={handleRegenerate}
                disabled={isGenerating}
                className="min-h-[44px] bg-red-600 hover:bg-red-500 active:bg-red-700 disabled:bg-zinc-700 px-6 sm:px-8 py-3 rounded-2xl font-semibold text-sm sm:text-base transition-all active:scale-[0.985] touch-manipulation"
              >
                {isGenerating ? "Generating..." : vibe === 'uplifting' ? "Regenerate Positives" : "Regenerate Roasts"}
              </button>
              <button
                onClick={resetUpload}
                className="min-h-[44px] bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 px-6 sm:px-8 py-3 rounded-2xl font-semibold text-sm sm:text-base transition-all active:scale-[0.985] touch-manipulation"
              >
                Upload Different Image
              </button>
              <button
                onClick={() => {
                  const vibes = ['crispy', 'medium_rare', 'light_toast', 'uplifting'] as const;
                  const next = vibes[(vibes.indexOf(vibe) + 1) % vibes.length];
                  setVibe(next);
                  handleRegenerate();
                }}
                disabled={isGenerating}
                className="min-h-[44px] bg-zinc-700 hover:bg-zinc-600 active:bg-zinc-500 px-4 py-3 rounded-2xl text-xs sm:text-sm font-medium transition-all active:scale-[0.985] touch-manipulation"
              >
                Different Vibe
              </button>
            </div>

            {/* Soft, non-pushy upsell — only appears for free users after a great roast experience */}
            {usage && !usage.isPaid && usage.remaining <= 2 && (
              <div className="mt-6 text-center p-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl">
                <p className="text-sm text-zinc-400 mb-2">These roasts hitting? Get 10 fresh ones every day for the price of a coffee.</p>
                <button 
                  onClick={() => setShowUpgradeModal(true)}
                  className="text-emerald-400 hover:text-emerald-300 text-sm underline active:text-emerald-200"
                >
                  See $0.99 packs →
                </button>
              </div>
            )}

            <div className="mt-4 text-center text-xs">
              <button onClick={copyReferralLink} className="text-emerald-400 hover:text-emerald-300 underline active:text-emerald-200 mr-3">
                Copy referral link
              </button>
              <button onClick={copyViralXPost} className="text-emerald-400 hover:text-emerald-300 underline active:text-emerald-200">
                Copy viral X text
              </button>
            </div>

            {usage && usage.remaining <= 0 && (
              <div className="text-center mt-4 p-4 bg-zinc-900 rounded-2xl border border-zinc-700">
                <p className="text-sm text-zinc-400 mb-2">
                  {usage.isPaid 
                    ? "You've used your 10 roasts for today." 
                    : "You've used your 3 free roasts total."}
                </p>
                <button 
                  onClick={() => setShowUpgradeModal(true)}
                  className="inline-block min-h-[44px] bg-emerald-600 active:bg-emerald-500 text-white px-6 py-2 rounded-2xl font-semibold text-sm transition-colors touch-manipulation"
                >
                  Unlock more roasts →
                </button>
                <p className="text-xs text-zinc-500 mt-2">Get 10 per day with any paid pack</p>
              </div>
            )}
          </div>
        ) : !previewUrl ? (
          /* Upload Area — drag & drop + click, fast & delightful */
          <div
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file && file.type.startsWith('image/')) {
                setError("");
                setSelectedFile(file);
                const reader = new FileReader();
                reader.onload = (event) => setPreviewUrl(event.target?.result as string);
                reader.readAsDataURL(file);
              }
            }}
            onDragOver={(e) => e.preventDefault()}
            onDragEnter={(e) => e.preventDefault()}
            className="border-2 border-dashed border-zinc-700 rounded-3xl p-8 sm:p-12 text-center hover:border-zinc-500 active:border-zinc-400 transition-colors"
          >
            <div className="mx-auto w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v-4m0 0V8m0 4h16m-8-4v8m-4 4h8" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Upload anything</h3>
            <p className="text-zinc-400 mb-6">Photo, screenshot, text convo, meme, email, X post — drop it or tap</p>
            
            <label className="inline-block bg-white text-black px-8 py-3 min-h-[48px] rounded-2xl font-semibold cursor-pointer active:bg-zinc-100 transition-colors touch-manipulation">
              Choose Image or Screenshot
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleFileSelect}
                className="hidden" 
              />
            </label>
            <p className="text-[10px] text-zinc-500 mt-4">Drag &amp; drop works too</p>
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
                className="absolute top-4 right-4 bg-black/70 text-white px-4 py-2 rounded-full text-sm hover:bg-black min-h-[44px] min-w-[44px] touch-manipulation active:bg-black/80"
              >
                Change image
              </button>
            </div>

            <div className="space-y-6">
              {/* Vibe Selector - optimized for mobile thumb tapping */}
              <div>
                <p className="text-sm text-zinc-400 mb-3 text-center">Choose the vibe</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {[
                    { value: 'crispy', label: 'Crispy' },
                    { value: 'medium_rare', label: 'Medium Rare' },
                    { value: 'light_toast', label: 'Light Toast' },
                    { value: 'uplifting', label: 'Uplifting' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setVibe(option.value as any)}
                      className={`min-h-[44px] min-w-[80px] px-4 py-2 rounded-full text-sm font-medium transition-colors active:scale-[0.985] ${
                        vibe === option.value
                          ? option.value === 'uplifting' 
                            ? 'bg-emerald-600 text-white' 
                            : 'bg-red-600 text-white'
                          : 'bg-zinc-800 text-zinc-300 active:bg-zinc-700'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom prompt - unlocked via the $1.99 add-on (available on top of any paid tier) */}
              {usage?.hasCustomPrompts ? (
                <div>
                  <p className="text-sm text-emerald-400 mb-1 text-center">Custom instructions (paid add-on)</p>
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="e.g. Roast this text convo like a savage stand-up comic. Focus on the awkward replies."
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-3 text-base text-white placeholder:text-zinc-500 min-h-[80px] resize-y"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1 text-center">Your custom instructions will guide the roast style.</p>
                </div>
              ) : (
                <div className="text-center">
                  <button
                    onClick={() => setShowUpgradeModal(true)}
                    className="text-xs text-emerald-400 hover:text-emerald-300 underline"
                  >
                    Unlock custom prompts for $1.99 (one-time add-on) →
                  </button>
                </div>
              )}

              <div className="text-center">
                {error && (
                  <p className="text-red-400 text-sm mb-4 bg-red-950/50 p-3 rounded-xl">
                    {error}
                  </p>
                )}
                <button
                  onClick={handleGetRoasted}
                  disabled={isGenerating}
                  className="bg-red-600 hover:bg-red-500 active:bg-red-700 disabled:bg-zinc-700 transition-colors text-white text-xl font-semibold px-12 py-4 rounded-2xl touch-manipulation active:scale-[0.985]"
                >
                  {isGenerating 
                    ? (generatingMessage || "Generating roasts...") 
                    : usage && usage.remaining <= 0 
                      ? (usage.isPaid ? "Daily limit reached — Upgrade" : "Free limit reached — Unlock more")
                      : "Get Roasted →"}
                </button>
                <p className="text-xs text-zinc-500 mt-3">
                  {getUsageLabel()}
                </p>

                {usage && usage.remaining <= 0 && (
                  <div className="mt-3">
                    <button 
                      onClick={() => setShowUpgradeModal(true)}
                      className="text-emerald-400 hover:text-emerald-300 text-sm underline"
                    >
                      See payment options to unlock more roasts →
                    </button>
                  </div>
                )}
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
          isUplifting={vibe === 'uplifting'}
          onClose={() => setShowCard(false)}
          onPostToX={usage && usage.remaining > 100000 ? () => postToX(selectedRoastForCard) : undefined}
          isOwner={!!(usage && usage.remaining > 100000)}
        />
      )}

      {/* Upgrade / Pay Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4">
          <div className="bg-zinc-900 rounded-3xl max-w-lg w-full p-6 text-center">
            <h2 className="text-2xl font-bold mb-2">
              {usage?.isPaid ? "Daily limit reached" : "Free limit reached"}
            </h2>
            <p className="text-zinc-400 mb-6">
              {usage?.isPaid 
                ? "You've used all 10 roasts for today. Buy another pack or go Unlimited for ongoing access."
                : "You've used your 3 free roasts (total). Any paid pack instantly unlocks 10 fresh roasts every single day."}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {/* Starter */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 flex flex-col">
                <div className="text-2xl font-bold">$0.99</div>
                <div className="text-sm text-zinc-400">Starter Pack</div>
                <div className="text-xs mt-1 mb-3 text-zinc-500">Unlocks 10 roasts per day (one-time)</div>
                <button
                  onClick={() => handleCheckout(STRIPE_PRICES.starter)}
                  disabled={isCheckingOut !== null}
                  className="mt-auto min-h-[44px] bg-zinc-800 active:bg-zinc-700 text-white py-2 rounded-xl text-sm font-semibold disabled:opacity-50 touch-manipulation"
                >
                  {isCheckingOut === STRIPE_PRICES.starter ? "Processing..." : "Buy Starter"}
                </button>
              </div>

              {/* Popular - featured */}
              <div className="bg-zinc-950 border-2 border-red-600 rounded-2xl p-4 flex flex-col relative">
                <div className="absolute -top-2 right-3 bg-red-600 text-[10px] px-2 py-0.5 rounded-full font-medium">MOST POPULAR</div>
                <div className="text-2xl font-bold">$4.99</div>
                <div className="text-sm text-zinc-400">Popular Pack</div>
                <div className="text-xs mt-1 mb-3 text-zinc-500">Unlocks 10 roasts per day (one-time)</div>
                <button
                  onClick={() => handleCheckout(STRIPE_PRICES.popular)}
                  disabled={isCheckingOut !== null}
                  className="mt-auto min-h-[44px] bg-red-600 active:bg-red-500 text-white py-2 rounded-xl text-sm font-semibold disabled:opacity-50 touch-manipulation"
                >
                  {isCheckingOut === STRIPE_PRICES.popular ? "Processing..." : "Buy Popular Pack"}
                </button>
              </div>

              {/* Heavy */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 flex flex-col">
                <div className="text-2xl font-bold">$9.99</div>
                <div className="text-sm text-zinc-400">Heavy Roaster</div>
                <div className="text-xs mt-1 mb-3 text-zinc-500">Unlocks 10 roasts per day (one-time)</div>
                <button
                  onClick={() => handleCheckout(STRIPE_PRICES.heavy)}
                  disabled={isCheckingOut !== null}
                  className="mt-auto min-h-[44px] bg-zinc-800 active:bg-zinc-700 text-white py-2 rounded-xl text-sm font-semibold disabled:opacity-50 touch-manipulation"
                >
                  {isCheckingOut === STRIPE_PRICES.heavy ? "Processing..." : "Buy Heavy Pack"}
                </button>
              </div>

              {/* Unlimited */}
              <div className="bg-zinc-950 border border-emerald-600 rounded-2xl p-4 flex flex-col">
                <div className="text-2xl font-bold">$19.99<span className="text-sm font-normal text-zinc-400">/mo</span></div>
                <div className="text-sm text-emerald-400">Unlimited Roasts</div>
                <div className="text-xs mt-1 mb-3 text-zinc-500">10 roasts per day, recurring</div>
                <button
                  onClick={() => handleCheckout(STRIPE_PRICES.unlimited)}
                  disabled={isCheckingOut !== null}
                  className="mt-auto min-h-[44px] bg-emerald-600 active:bg-emerald-500 text-white py-2 rounded-xl text-sm font-semibold disabled:opacity-50 touch-manipulation"
                >
                  {isCheckingOut === STRIPE_PRICES.unlimited ? "Processing..." : "Get Unlimited"}
                </button>
              </div>
            </div>

            <p className="text-[10px] text-zinc-500 mb-4">
              One-time packs unlock the 10-roast daily cap on this browser/device. Unlimited Roasts is a recurring monthly subscription.
            </p>

            {/* $1.99 Custom Prompts Add-on (available on top of any paid tier) */}
            <div className="mb-4 p-3 bg-zinc-950 border border-emerald-600 rounded-2xl text-left">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-emerald-400">Create Your Own Prompt — $1.99 one-time</div>
                  <div className="text-xs text-zinc-400">Unlock the custom instructions box. Works with Starter, Popular, Heavy, or Unlimited.</div>
                </div>
                <button
                  onClick={() => handleCheckout(STRIPE_PRICES.customPrompts)}
                  disabled={isCheckingOut !== null}
                  className="shrink-0 min-h-[44px] bg-emerald-600 active:bg-emerald-700 text-white px-4 py-1.5 rounded-xl text-xs font-semibold disabled:opacity-50 whitespace-nowrap transition-colors"
                >
                  {isCheckingOut === STRIPE_PRICES.customPrompts ? "..." : "Buy Add-on"}
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="flex-1 min-h-[44px] bg-zinc-800 active:bg-zinc-700 py-2.5 rounded-2xl text-sm transition-colors"
              >
                Maybe later
              </button>
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="flex-1 min-h-[44px] bg-zinc-700 active:bg-zinc-600 py-2.5 rounded-2xl text-sm transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

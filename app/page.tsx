'use client';

import { useRef, useState } from 'react';
import { STRIPE_PRICES } from '@/lib/stripe';

export default function RoastlyLanding() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log('Selected file:', file);
      alert(`Photo selected: ${file.name}\n\n(We'll build the actual roasting flow next)`);
    }
  };

  const handleCheckout = async (priceId: string, mode: "payment" | "subscription" = "payment") => {
    if (!priceId) {
      alert("This product isn't set up yet.");
      return;
    }

    setIsLoading(priceId);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId, mode }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Something went wrong");
      }
    } catch (error) {
      console.error(error);
      alert("Failed to start checkout. Please try again.");
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Hero with Roastable Background Images */}
      <div className="relative flex flex-col items-center justify-center px-6 pt-20 pb-24 text-center overflow-hidden min-h-[85vh]">

        {/* Dark overlay - placed FIRST */}
        <div className="absolute inset-0 bg-zinc-950/80 z-10" />

        {/* Background Images - placed AFTER the overlay */}
        <div className="absolute inset-0 z-20 opacity-25">
          {/* Image 1 */}
          <div className="absolute top-8 left-8 w-44 h-44 rotate-[-14deg] overflow-hidden rounded-3xl">
            <img src="https://picsum.photos/id/1005/400/400" className="w-full h-full object-cover" />
          </div>
          {/* Image 2 */}
          <div className="absolute top-24 right-12 w-36 h-36 rotate-[11deg] overflow-hidden rounded-3xl">
            <img src="https://picsum.photos/id/1011/400/400" className="w-full h-full object-cover" />
          </div>
          {/* Image 3 */}
          <div className="absolute top-48 left-24 w-40 h-40 rotate-[18deg] overflow-hidden rounded-3xl">
            <img src="https://picsum.photos/id/160/400/400" className="w-full h-full object-cover" />
          </div>
          {/* Image 4 */}
          <div className="absolute bottom-20 right-20 w-48 h-48 rotate-[-8deg] overflow-hidden rounded-3xl">
            <img src="https://picsum.photos/id/201/400/400" className="w-full h-full object-cover" />
          </div>
          {/* Image 5 */}
          <div className="absolute bottom-32 left-12 w-32 h-32 rotate-[22deg] overflow-hidden rounded-3xl">
            <img src="https://picsum.photos/id/29/400/400" className="w-full h-full object-cover" />
          </div>
          {/* Image 6 */}
          <div className="absolute top-16 right-40 w-28 h-28 rotate-[-19deg] overflow-hidden rounded-3xl">
            <img src="https://picsum.photos/id/1006/400/400" className="w-full h-full object-cover" />
          </div>
          {/* Image 7 */}
          <div className="absolute bottom-10 right-44 w-36 h-36 rotate-[7deg] overflow-hidden rounded-3xl">
            <img src="https://picsum.photos/id/251/400/400" className="w-full h-full object-cover" />
          </div>
          {/* Image 8 */}
          <div className="absolute top-40 left-44 w-30 h-30 rotate-[-25deg] overflow-hidden rounded-3xl">
            <img src="https://picsum.photos/id/1009/400/400" className="w-full h-full object-cover" />
          </div>
        </div>

        {/* Hero Content */}
        <div className="relative z-30 max-w-3xl">
          <div className="inline-block mb-4 px-4 py-1 rounded-full bg-zinc-900 text-sm text-zinc-400 border border-zinc-800">
            The most brutal AI roasts on the internet
          </div>

          <h1 className="text-7xl font-bold tracking-tighter mb-6">
            Get roasted.<br />Share the pain.
          </h1>

          <p className="text-2xl text-zinc-400 mb-10 max-w-xl mx-auto">
            Upload a photo. Get destroyed by AI. <br />
            Then share the results with your friends.
          </p>

          <a 
            href="/roast"
            className="inline-block bg-red-600 hover:bg-red-500 transition-all text-white text-xl font-semibold px-10 py-4 rounded-2xl active:scale-[0.985]"
          >
            Upload photo & get roasted →
          </a>

          <p className="mt-4 text-sm text-zinc-500">
            Free to try • No credit card required
          </p>
        </div>

        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />
      </div>

      {/* Example Roasts - Text Only */}
      <div className="max-w-3xl mx-auto px-6 pb-20">
        <div className="text-center mb-10">
          <p className="text-zinc-500 text-sm tracking-[3px] mb-2">SOME OF OUR GREATEST HITS</p>
          <h2 className="text-4xl font-semibold tracking-tight">Recent Roasts</h2>
        </div>

        <div className="space-y-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <p className="text-red-400 text-sm mb-1">BRUTAL</p>
            <p className="text-lg">“You look like you were generated by AI and the prompt was ‘make it worse’.”</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <p className="text-red-400 text-sm mb-1">SAVAGE</p>
            <p className="text-lg">“Your entire personality is just ‘I saw this on TikTok’.”</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <p className="text-red-400 text-sm mb-1">UNHINGED</p>
            <p className="text-lg">“You give off ‘I peaked in middle school and I’ve been chasing that high ever since’ energy.”</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <p className="text-red-400 text-sm mb-1">SAVAGE</p>
            <p className="text-lg">“Even your shadow wants to distance itself from you.”</p>
          </div>
        </div>

        <p className="text-center text-zinc-500 text-sm mt-8">
          These are real roasts people got. Yours will be worse.
        </p>
      </div>

      {/* Pricing Section - Payment Portal */}
      <div className="max-w-5xl mx-auto px-6 pb-24">
        <div className="text-center mb-12">
          <p className="text-red-400 text-sm tracking-[3px] mb-2">PRICING</p>
          <h2 className="text-5xl font-bold tracking-tighter">Pay only for what you use</h2>
          <p className="text-xl text-zinc-400 mt-4">No subscriptions required. Buy credits when you need them.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Free */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col">
            <div>
              <p className="text-zinc-400 text-sm">FREE</p>
              <div className="mt-4">
                <span className="text-5xl font-bold">$0</span>
              </div>
              <p className="text-zinc-400 mt-1">3 roasts to start</p>
              <p className="text-xs text-zinc-400 mt-1">The participation trophy of roasting</p>
            </div>
            <a href="/roast" className="mt-auto w-full bg-zinc-800 hover:bg-zinc-700 transition-colors text-white py-3 rounded-2xl font-semibold text-center inline-block">
              Get Started Free
            </a>
          </div>

          {/* Starter - $0.99 */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col">
            <div>
              <p className="text-zinc-400 text-sm">STARTER</p>
              <div className="mt-4">
                <span className="text-5xl font-bold">$0.99</span>
              </div>
              <p className="text-zinc-400 mt-1">5 roasts</p>
              <p className="text-xs text-zinc-400 mt-1">Baby's first burn</p>
            </div>
            <button
              onClick={() => handleCheckout(STRIPE_PRICES.starter)}
              disabled={isLoading !== null}
              className="mt-auto w-full bg-zinc-800 hover:bg-zinc-700 transition-colors text-white py-3 rounded-2xl font-semibold disabled:opacity-50"
            >
              {isLoading === STRIPE_PRICES.starter ? "Processing..." : "Buy Starter Pack"}
            </button>
          </div>

          {/* Popular - $4.99 */}
          <div className="bg-zinc-900 border-2 border-red-600 rounded-3xl p-6 flex flex-col relative">
            <div className="absolute -top-3 right-4 bg-red-600 text-xs px-3 py-1 rounded-full font-medium">
              MOST POPULAR
            </div>
            <div>
              <p className="text-zinc-400 text-sm">POPULAR</p>
              <div className="mt-4">
                <span className="text-5xl font-bold">$4.99</span>
              </div>
              <p className="text-zinc-400 mt-1">25 roasts</p>
              <p className="text-xs text-zinc-400 mt-1">For when you're finally ready to commit to the bit</p>
            </div>
            <button
              onClick={() => handleCheckout(STRIPE_PRICES.popular)}
              disabled={isLoading !== null}
              className="mt-auto w-full bg-red-600 hover:bg-red-500 transition-colors text-white py-3 rounded-2xl font-semibold disabled:opacity-50"
            >
              {isLoading === STRIPE_PRICES.popular ? "Processing..." : "Buy Popular Pack"}
            </button>
          </div>

          {/* Heavy User - $9.99 for 50 */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col">
            <div>
              <p className="text-zinc-400 text-sm">HEAVY USER</p>
              <div className="mt-4">
                <span className="text-5xl font-bold">$9.99</span>
              </div>
              <p className="text-zinc-400 mt-1">50 roasts</p>
              <p className="text-xs text-zinc-400 mt-1">For people with a lot of enemies (or one very annoying friend)</p>
            </div>
            <button
              onClick={() => handleCheckout(STRIPE_PRICES.heavy)}
              disabled={isLoading !== null}
              className="mt-auto w-full bg-zinc-800 hover:bg-zinc-700 transition-colors text-white py-3 rounded-2xl font-semibold disabled:opacity-50"
            >
              {isLoading === STRIPE_PRICES.heavy ? "Processing..." : "Buy Heavy Pack"}
            </button>
          </div>

          {/* Pro Daily - $19.99/mo */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col">
            <div>
              <p className="text-zinc-400 text-sm">PRO DAILY</p>
              <div className="mt-4">
                <span className="text-5xl font-bold">$19.99</span>
                <span className="text-zinc-400">/mo</span>
              </div>
              <p className="text-zinc-400 mt-1">10 roasts per day</p>
              <p className="text-xs text-emerald-400 mt-1">Best for heavy users</p>
              <p className="text-xs text-zinc-400 mt-1">For when being an asshole is your full-time job</p>
            </div>
            <button
              onClick={() => handleCheckout(STRIPE_PRICES.unlimited, "subscription")}
              disabled={isLoading !== null}
              className="mt-auto w-full bg-zinc-800 hover:bg-zinc-700 transition-colors text-white py-3 rounded-2xl font-semibold disabled:opacity-50"
            >
              {isLoading === STRIPE_PRICES.unlimited ? "Processing..." : "Go Pro Daily"}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-zinc-500 mt-8">
          All purchases are one-time (except Pro Daily). No hidden fees.
        </p>
      </div>
    </div>
  );
}

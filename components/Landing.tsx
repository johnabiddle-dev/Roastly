'use client';

import { useState } from 'react';
import { CREDIT_PACKS, STRIPE_PRICES } from '@/lib/stripe';
import { getFreeLimit, getJuly4PromoBanner } from '@/lib/promo';
import { getBrowserId, startCheckout } from '@/lib/client';
import { trackEvent } from '@/lib/analytics';
import { FAQ } from '@/lib/site';
import { copyInviteLink } from '@/lib/share';

const SAMPLES = [
  { tag: 'GROUP CHAT', roast: 'The way y’all type like you’re being chased by punctuation is actually impressive.', rotate: '-rotate-3' },
  { tag: 'SELFIE', roast: 'This is the photo equivalent of bringing a participation trophy to a gunfight.', rotate: 'rotate-2' },
];

const LANDING_PACKS = ['pack10', 'pack50', 'pack500'] as const;

export default function Landing() {
  const [loading, setLoading] = useState<string | null>(null);
  const [inviteState, setInviteState] = useState<'idle' | 'copied'>('idle');
  const free = getFreeLimit();
  const packs = LANDING_PACKS.map((key) => CREDIT_PACKS.find((pack) => pack.key === key)).filter(Boolean);

  const checkout = async (priceId: string) => {
    setLoading(priceId);
    try {
      const result = await startCheckout(priceId, 'landing');
      if (result.url) window.location.href = result.url;
      else alert(result.error || 'Something went wrong');
    } catch {
      alert('Failed to start checkout. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="relative flex flex-col items-center px-4 sm:px-6 pt-14 sm:pt-20 pb-8 text-center">
        <div className="relative z-10 max-w-xl w-full">
          {getJuly4PromoBanner() && (
            <div className="mb-4 mx-auto max-w-lg px-4 py-2.5 rounded-2xl bg-red-950/70 border border-red-500/60 text-red-100 text-sm font-semibold">
              {getJuly4PromoBanner()}
            </div>
          )}
          <div className="inline-block mb-3 px-3 py-1 rounded-full bg-zinc-900 text-xs text-zinc-400 border border-zinc-800">
            Grok-powered roast cards · no signup · ~8 seconds
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tighter mb-3 leading-[1.05]">
            Roast anything.<br />Send the card.
          </h1>
          <p className="text-base sm:text-xl text-zinc-400 mb-6 max-w-md mx-auto">
            Upload a screenshot, selfie, or group chat. Get 5 burns. Drop the card in iMessage. That&apos;s how strangers find Roastly.
          </p>
          <a
            href="/roast"
            onClick={() => trackEvent('landing_cta_clicked', { spot: 'hero' })}
            className="inline-flex items-center justify-center w-full sm:w-auto min-h-[56px] bg-red-600 active:bg-red-700 transition-all text-white text-lg sm:text-xl font-bold px-8 sm:px-10 py-3 sm:py-4 rounded-2xl active:scale-[0.985] touch-manipulation shadow-lg shadow-red-900/30"
          >
            Try {free} free roasts →
          </a>
          <p className="mt-2.5 text-xs text-zinc-500">
            No account. Then one-time packs at $1 / $4.99 / $19.99. No subscription.
          </p>
        </div>
        <div className="relative mt-10 w-full max-w-md h-56 sm:h-64 pointer-events-none">
          {SAMPLES.map((sample, i) => (
            <div
              key={sample.tag}
              className={`absolute left-1/2 w-[78%] -translate-x-1/2 rounded-3xl border-2 border-red-600/40 bg-zinc-950 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.55)] ${sample.rotate} ${i === 0 ? 'top-0 z-10' : 'top-8 z-20'}`}
            >
              <div className="h-16 sm:h-20 bg-gradient-to-br from-zinc-800 via-zinc-900 to-red-950/40" />
              <div className="px-4 py-3 text-center">
                <p className="text-[10px] uppercase tracking-wider text-red-400 mb-1">{sample.tag}</p>
                <p className="text-sm font-bold leading-snug text-white">{sample.roast}</p>
                <p className="mt-2 text-[8px] tracking-[2px] text-zinc-600">ROASTED BY</p>
                <p className="text-red-500 text-[11px] font-bold">SAUCY GROK</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-xl mx-auto px-6 pb-12">
        <div className="grid grid-cols-3 gap-2 text-center text-xs sm:text-sm text-zinc-400">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 px-2 py-3">
            <p className="text-white font-semibold mb-0.5">1. Upload</p>
            Photo or screenshot
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 px-2 py-3">
            <p className="text-white font-semibold mb-0.5">2. Pick</p>
            5 roast options
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 px-2 py-3">
            <p className="text-white font-semibold mb-0.5">3. Send</p>
            Card → iMessage
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 pb-14">
        <p className="text-center text-zinc-500 text-xs tracking-[3px] mb-5">ANYTHING GOES</p>
        <div className="space-y-3">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-5">
            <p className="text-red-400 text-xs mb-1">IMESSAGE</p>
            <p className="text-base sm:text-lg">“This is the text equivalent of bringing a participation trophy to a gunfight.”</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-5">
            <p className="text-red-400 text-xs mb-1">PET PHOTO</p>
            <p className="text-base sm:text-lg">“This dog looks like it pays rent and still complains about it.”</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-5">
            <p className="text-red-400 text-xs mb-1">DATING PROFILE</p>
            <p className="text-base sm:text-lg">“‘Love to travel’ and the only stamp in your passport is from the airport Chili&apos;s.”</p>
          </div>
        </div>
        <div className="text-center mt-6">
          <a
            href="/roast"
            onClick={() => trackEvent('landing_cta_clicked', { spot: 'examples' })}
            className="inline-flex min-h-[48px] items-center justify-center bg-red-600 active:bg-red-500 text-white font-semibold px-8 py-3 rounded-2xl touch-manipulation"
          >
            Roast something free →
          </a>
        </div>
      </div>

      <div id="pricing" className="max-w-lg mx-auto px-4 sm:px-6 pb-16">
        <div className="text-center mb-5">
          <p className="text-zinc-500 text-xs tracking-[3px] mb-1.5">AFTER {free} FREE ROASTS</p>
          <h2 className="text-2xl font-bold tracking-tight">One-time packs</h2>
          <p className="text-sm text-zinc-500 mt-1.5">$1 / $4.99 / $19.99 · Apple Pay · nothing recurring</p>
        </div>
        <div className="space-y-2.5">
          {packs.map((pack) =>
            pack ? (
              <button
                key={pack.key}
                type="button"
                onClick={() => checkout(STRIPE_PRICES[pack.key])}
                disabled={loading !== null}
                className={`w-full min-h-[64px] flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left touch-manipulation disabled:opacity-50 ${
                  pack.popular ? 'bg-red-950/50 border-2 border-red-600' : 'bg-zinc-900 border border-zinc-800 active:bg-zinc-800'
                }`}
              >
                <div>
                  <p className="text-sm font-semibold">
                    {pack.credits} roasts
                    {pack.popular ? <span className="ml-2 text-[10px] uppercase tracking-wide text-red-400">popular</span> : null}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {pack.perRoastLabel}/roast · {pack.blurb}
                  </p>
                </div>
                <span className="shrink-0 text-lg font-bold">{loading === STRIPE_PRICES[pack.key] ? '…' : pack.priceLabel}</span>
              </button>
            ) : null
          )}
        </div>
        <p className="text-center text-[11px] text-zinc-600 mt-3">One-time on this device · Gym Bro, British, Street & more</p>
        <p className="text-center text-xs text-zinc-400 mt-2 leading-relaxed">Credits live in this browser. Don&apos;t clear the site data or they vanish.</p>
      </div>

      <div className="max-w-lg mx-auto px-4 sm:px-6 pb-16">
        <div className="rounded-3xl border border-emerald-800/60 bg-emerald-950/30 px-5 py-6 text-center">
          <p className="text-zinc-500 text-xs tracking-[3px] mb-2">GROWTH MOVE</p>
          <h2 className="text-2xl font-bold tracking-tight mb-2">Send the card. Get +5 when they pay.</h2>
          <p className="text-sm text-zinc-400 mb-4 leading-relaxed">
            Drop the roast card in iMessage or the group chat. Friends get {free} free roasts. When they buy a pack, you get +5 credits.
          </p>
          <button
            type="button"
            onClick={async () => {
              try {
                await copyInviteLink(getBrowserId());
                setInviteState('copied');
                trackEvent('referral_copied', { source: 'landing' });
              } catch {
                alert('Could not copy the invite link.');
              }
            }}
            className="min-h-[48px] w-full bg-emerald-600 active:bg-emerald-700 text-white text-sm px-4 py-3 rounded-2xl font-semibold touch-manipulation"
          >
            {inviteState === 'copied' ? 'Invite link copied ✓' : 'Copy invite link'}
          </button>
          <p className="text-[11px] text-zinc-500 mt-3">Friend buys → you get +5. No daily posting. Just send the card.</p>
        </div>
      </div>

      <section id="faq" aria-labelledby="faq-heading" className="max-w-lg mx-auto px-4 sm:px-6 pb-16">
        <h2 id="faq-heading" className="text-2xl font-bold tracking-tight text-center mb-5">FAQ</h2>
        <div className="space-y-4">
          {FAQ.map((item) => (
            <article key={item.question} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 px-4 py-4">
              <h3 className="text-base font-semibold mb-2">{item.question}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">{item.answer}</p>
            </article>
          ))}
        </div>
      </section>

      <div className="fixed bottom-0 left-0 right-0 z-50 sm:hidden bg-zinc-950/95 border-t border-zinc-800 px-4 py-3 pb-safe backdrop-blur-md">
        <a
          href="/roast"
          onClick={() => trackEvent('landing_cta_clicked', { spot: 'sticky' })}
          className="flex min-h-[52px] items-center justify-center w-full bg-red-600 active:bg-red-500 text-white font-bold rounded-2xl touch-manipulation"
        >
          Try {free} free roasts →
        </a>
      </div>

      <div className="text-center pb-24 sm:pb-8 text-xs text-zinc-500 border-t border-zinc-800 pt-6">
        <a href="/privacy" className="hover:text-zinc-400 mx-2">Privacy</a>
        <a href="/terms" className="hover:text-zinc-400 mx-2">Terms</a>
        <span className="mx-2">•</span>
        <span>Payments by Stripe • Roasts by Grok (xAI)</span>
      </div>
    </div>
  );
}

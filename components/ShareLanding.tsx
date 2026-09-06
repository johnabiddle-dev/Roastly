'use client';

import { useEffect, useState } from 'react';
import { CREDIT_PACKS, STRIPE_PRICES } from '@/lib/stripe';
import { getFreeLimit } from '@/lib/promo';
import { startCheckout } from '@/lib/client';
import { trackEvent } from '@/lib/analytics';
import { roastPath } from '@/lib/site';

const LANDING_PACKS = ['pack10', 'pack50', 'pack500'] as const;

type Props = {
  referrer?: string | null;
};

export default function ShareLanding({ referrer }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const free = getFreeLimit();
  const packs = LANDING_PACKS.map((key) => CREDIT_PACKS.find((pack) => pack.key === key)).filter(Boolean);
  const startHref = roastPath(referrer || null);

  useEffect(() => {
    trackEvent('share_landing_viewed', { hasRef: !!referrer });
  }, [referrer]);

  const checkout = async (priceId: string) => {
    setLoading(priceId);
    try {
      const result = await startCheckout(priceId, 'share_landing');
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
      <div className="max-w-xl mx-auto px-4 sm:px-6 pt-14 sm:pt-20 pb-24 sm:pb-12 text-center">
        <p className="inline-block mb-3 px-3 py-1 rounded-full bg-red-950/70 border border-red-700/60 text-red-200 text-xs font-semibold">
          Someone sent you a roast card
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tighter mb-3 leading-[1.05]">
          Try {free} free roasts.<br />Then send yours.
        </h1>
        <p className="text-base sm:text-lg text-zinc-400 mb-6 max-w-md mx-auto">
          Roastly turns any photo or screenshot into a roast card. Send it in iMessage or the group chat. After {free} free ones, packs are $1 / $4.99 / $19.99 — one-time, no subscription.
        </p>
        <a
          href={startHref}
          onClick={() => trackEvent('share_cta_clicked', { spot: 'hero' })}
          className="inline-flex items-center justify-center w-full min-h-[56px] bg-red-600 active:bg-red-700 text-white text-lg font-bold px-8 py-3 rounded-2xl touch-manipulation shadow-lg shadow-red-900/30"
        >
          Try {free} free roasts →
        </a>
        <p className="mt-3 text-sm text-emerald-400/90 leading-relaxed">
          If you buy a pack, the friend who sent this card gets +5 credits.
        </p>

        <div className="mt-10 grid grid-cols-3 gap-2 text-center text-xs sm:text-sm text-zinc-400">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 px-2 py-3">
            <p className="text-white font-semibold mb-0.5">1. Upload</p>
            Anything roastable
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 px-2 py-3">
            <p className="text-white font-semibold mb-0.5">2. Pick</p>
            5 roast cards
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 px-2 py-3">
            <p className="text-white font-semibold mb-0.5">3. Send</p>
            iMessage / chat
          </div>
        </div>

        <section id="pricing" className="mt-12 text-left">
          <p className="text-center text-zinc-500 text-xs tracking-[3px] mb-2">ONE-TIME PACKS</p>
          <h2 className="text-2xl font-bold tracking-tight text-center mb-4">$1 / $4.99 / $19.99</h2>
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
                    <p className="text-xs text-zinc-500">{pack.blurb}</p>
                  </div>
                  <span className="shrink-0 text-lg font-bold">{loading === STRIPE_PRICES[pack.key] ? '…' : pack.priceLabel}</span>
                </button>
              ) : null
            )}
          </div>
          <p className="text-center text-[11px] text-zinc-600 mt-3">No subscription. Credits stay on this device.</p>
        </section>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50 sm:hidden bg-zinc-950/95 border-t border-zinc-800 px-4 py-3 pb-safe backdrop-blur-md">
        <a
          href={startHref}
          onClick={() => trackEvent('share_cta_clicked', { spot: 'sticky' })}
          className="flex min-h-[52px] items-center justify-center w-full bg-red-600 active:bg-red-500 text-white font-bold rounded-2xl touch-manipulation"
        >
          Try {free} free roasts →
        </a>
      </div>
    </div>
  );
}

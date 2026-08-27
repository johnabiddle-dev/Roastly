'use client';

import { useEffect, useState } from 'react';
import { CREDIT_PACKS, STRIPE_PRICES } from '@/lib/stripe';
import { trackEvent } from '@/lib/analytics';
import type { UsageStatus } from '@/lib/types';

type Props = {
  usage: UsageStatus | null;
  onClose: () => void;
  onCheckout: (priceId: string) => void;
  isCheckingOut: string | null;
  showFirstRoastOffer?: boolean;
  limitReached?: boolean;
  styleIntent?: string | null;
};

export default function UpgradeModal({
  usage,
  onClose,
  onCheckout,
  isCheckingOut,
  showFirstRoastOffer = false,
  limitReached = false,
  styleIntent = null,
}: Props) {
  const [showMore, setShowMore] = useState(false);
  const out = limitReached || !!(usage && usage.remaining <= 0);
  const starter = CREDIT_PACKS[0];
  const popular = CREDIT_PACKS.find((pack) => pack.popular) ?? CREDIT_PACKS[1];
  const styleName = styleIntent
    ? styleIntent.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : null;

  useEffect(() => {
    trackEvent('upsell_viewed', { limitReached: out, firstRoast: showFirstRoastOffer, style: styleIntent || 'none' });
  }, [out, showFirstRoastOffer, styleIntent]);

  const title = styleName
    ? `Unlock ${styleName}`
    : out
      ? usage?.isPaid || (usage?.credits ?? 0) > 0
        ? 'Out of roast credits'
        : 'That was your last free one'
      : showFirstRoastOffer
        ? 'That roast was savage'
        : 'Want another voice?';

  const subtitle = styleName
    ? `${styleName} plus Gym Bro, British, Street and more — $1 for 10 credits. One-time.`
    : out
      ? '10 more roasts and every style. $1, one-time. Apple Pay.'
      : 'Try it in Gym Bro or British. $1 for 10 more. Nothing recurring.';

  return (
    <div className="fixed inset-0 bg-black/92 flex items-end sm:items-center justify-center z-[60] p-0 sm:p-4">
      <div className="bg-zinc-900 rounded-t-3xl sm:rounded-3xl max-w-md w-full max-h-[92vh] overflow-y-auto p-5 sm:p-6 text-center pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <h2 className="text-2xl sm:text-3xl font-bold mb-1">{title}</h2>
        <p className="text-zinc-400 text-sm sm:text-base mb-4">{subtitle}</p>
        <div className="mb-3 p-4 bg-red-950/50 border-2 border-red-600 rounded-2xl text-left">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-red-400 font-semibold">One-time · Apple Pay</p>
              <p className="text-3xl font-bold mt-1">{starter.priceLabel}</p>
              <p className="text-sm text-zinc-300 font-medium">{starter.credits} credits · every style unlocked</p>
            </div>
            <button
              type="button"
              onClick={() => onCheckout(STRIPE_PRICES[starter.key])}
              disabled={isCheckingOut !== null}
              className="shrink-0 min-h-[52px] min-w-[104px] bg-red-600 active:bg-red-500 text-white px-5 py-3 rounded-2xl text-sm font-bold disabled:opacity-50 touch-manipulation"
            >
              {isCheckingOut === STRIPE_PRICES[starter.key] ? '…' : 'Get it'}
            </button>
          </div>
        </div>
        {out && (
          <button
            type="button"
            onClick={() => onCheckout(STRIPE_PRICES[popular.key])}
            disabled={isCheckingOut !== null}
            className="mb-3 w-full p-3 rounded-2xl border border-zinc-700 bg-zinc-950 text-left active:bg-zinc-800 disabled:opacity-50 touch-manipulation"
          >
            <p className="text-sm font-semibold text-white">
              {popular.credits} roasts — {popular.priceLabel}
              <span className="text-zinc-500 font-normal"> · {popular.perRoastLabel}/roast</span>
            </p>
          </button>
        )}
        <button type="button" onClick={() => setShowMore((v) => !v)} className="text-xs text-zinc-500 underline touch-manipulation min-h-[36px] mb-2">
          {showMore ? 'Hide other sizes' : 'Other pack sizes'}
        </button>
        {showMore && (
          <div className="grid grid-cols-2 gap-2 mb-3">
            {CREDIT_PACKS.filter((pack) => pack.key !== starter.key).map((pack) => (
              <button
                key={pack.key}
                type="button"
                onClick={() => onCheckout(STRIPE_PRICES[pack.key])}
                disabled={isCheckingOut !== null}
                className="min-h-[60px] bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-left active:bg-zinc-800 disabled:opacity-50 touch-manipulation"
              >
                <p className="text-base font-bold">{pack.priceLabel}</p>
                <p className="text-[10px] text-zinc-400">
                  {pack.credits} roasts · {pack.perRoastLabel}
                </p>
              </button>
            ))}
            <button
              type="button"
              onClick={() => onCheckout(STRIPE_PRICES.customPrompts)}
              disabled={isCheckingOut !== null}
              className="col-span-2 min-h-[48px] bg-zinc-950 border border-emerald-800/50 rounded-xl p-3 text-left active:bg-zinc-800 disabled:opacity-50 touch-manipulation"
            >
              <p className="text-sm font-semibold text-emerald-400">Custom prompts — $1.99</p>
              <p className="text-[10px] text-zinc-500">Write your own roast instructions</p>
            </button>
          </div>
        )}
        <p className="text-[10px] text-zinc-600 mb-2">Instant · Apple Pay & cards · no subscription</p>
        <p className="text-xs text-zinc-400 mb-3 leading-relaxed">Credits live in this browser. Don&apos;t clear the site data or they vanish.</p>
        <button
          type="button"
          onClick={onClose}
          className="w-full min-h-[48px] text-zinc-500 active:text-zinc-300 py-2 text-sm touch-manipulation"
        >
          {out ? 'Keep this roast — maybe later' : 'Keep roasting free'}
        </button>
      </div>
    </div>
  );
}

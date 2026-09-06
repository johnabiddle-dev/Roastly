'use client';

import { useEffect, useRef, useState } from 'react';
import { generateRoastCardImage } from '@/lib/generate-card';
import { getRoastStyle, type RoastStyleId } from '@/lib/roast-styles';
import { copyInviteLink, groupChatCaption, shareButtonLabel, shareOrCopyCard } from '@/lib/share';
import { getBrowserId } from '@/lib/client';
import { getJuly4PromoHook } from '@/lib/promo';
import { trackEvent } from '@/lib/analytics';

type Props = {
  imageUrl: string;
  roastText: string;
  vibe: string;
  styleId?: RoastStyleId;
  isUplifting?: boolean;
  onClose?: () => void;
  onPostToX?: () => void;
  isOwner?: boolean;
  onEngaged?: () => void;
  onRoastAgain?: () => void;
};

export default function RoastCard({
  imageUrl,
  roastText,
  vibe,
  styleId = 'default',
  isUplifting = false,
  onClose,
  onPostToX,
  isOwner = false,
  onEngaged,
  onRoastAgain,
}: Props) {
  const [cardUrl, setCardUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [shareState, setShareState] = useState<'idle' | 'saving' | 'shared' | 'copied' | 'downloaded' | 'error'>('idle');
  const [inviteState, setInviteState] = useState<'idle' | 'copied'>('idle');
  const [submitState, setSubmitState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const engaged = useRef(false);
  const mobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent || '');
  const style = getRoastStyle(styleId);
  const options = {
    isUplifting,
    styleLabel: style.id === 'default' ? null : style.label,
    styleAccent: style.accent,
  };

  const markEngaged = () => {
    if (engaged.current) return;
    engaged.current = true;
    onEngaged?.();
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const url = await generateRoastCardImage(imageUrl, roastText, options);
        if (!cancelled) {
          setCardUrl(url);
          setLoading(false);
          trackEvent('roast_card_generated', { style: styleId });
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl, roastText, isUplifting, styleId]);

  const share = async () => {
    setShareState('saving');
    try {
      const result = await shareOrCopyCard(imageUrl, roastText, options);
      setShareState(result);
      trackEvent('share_group_chat', { style: styleId, method: result });
      markEngaged();
    } catch (error) {
      const err = error as { name?: string };
      setShareState(err?.name === 'AbortError' ? 'idle' : 'error');
    }
  };

  const submitFeature = async () => {
    if (!cardUrl) return;
    setSubmitState('saving');
    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('decode'));
        img.src = cardUrl;
      });
      const canvas = document.createElement('canvas');
      const max = 720;
      let { width, height } = img;
      if (width > max) {
        height = Math.round((max / width) * height);
        width = max;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('canvas');
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      const imageBase64 = canvas.toDataURL('image/jpeg', 0.82).split(',')[1];
      const res = await fetch('/api/community-roast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: roastText, vibe, style: styleId, anonymous: true, imageBase64 }),
      });
      if (!res.ok) throw new Error('Failed');
      setSubmitState('saved');
      trackEvent('community_roast_submitted', { anonymous: true, source: 'card', style: styleId });
    } catch {
      setSubmitState('error');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/95 flex flex-col z-50">
      <div className="shrink-0 flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
        <p className="text-xs uppercase tracking-wider text-zinc-500">
          Your card{style.id !== 'default' ? ` · ${style.label}` : ''}
        </p>
        <button onClick={onClose} className="text-sm text-zinc-400 min-h-[44px] px-3 touch-manipulation active:text-white">
          ← Pick different roast
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 min-h-0 overflow-hidden">
        {loading ? (
          <div className="text-center">
            <div className="w-10 h-10 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-zinc-400">Generating your card…</p>
          </div>
        ) : cardUrl ? (
          <img src={cardUrl} alt="Your roast card" className="max-h-full max-w-full rounded-2xl shadow-2xl object-contain" />
        ) : (
          <p className="text-sm text-red-400">Couldn&apos;t generate card. Try again.</p>
        )}
      </div>

      <div className="shrink-0 px-4 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-2 bg-zinc-950/80 border-t border-zinc-800">
        <div className="flex justify-center gap-2 text-[10px] mb-1">
          <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">1. Upload ✓</span>
          <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">2. Pick ✓</span>
          <span className="px-2 py-0.5 rounded-full bg-red-600/30 text-red-300 border border-red-600/40">3. Send the card</span>
        </div>
        <p className="text-center text-[11px] text-zinc-400">
          Send this in iMessage or the group chat. They get 3 free roasts — if they buy, you get +5.
        </p>
        <button
          onClick={share}
          disabled={!cardUrl || shareState === 'saving'}
          className="w-full min-h-[56px] bg-red-600 active:bg-red-500 disabled:opacity-50 text-white font-bold rounded-2xl text-base touch-manipulation"
        >
          {shareState === 'saving'
            ? mobile
              ? 'Opening iMessage…'
              : 'Copying card…'
            : shareState === 'shared'
              ? 'Sent ✓'
              : shareState === 'copied'
                ? 'Card copied ✓'
                : shareState === 'downloaded'
                  ? 'Saved ✓'
                  : shareButtonLabel()}
        </button>
        {onRoastAgain && (
          <button
            type="button"
            onClick={onRoastAgain}
            className="w-full min-h-[48px] bg-zinc-800 active:bg-zinc-700 text-white font-semibold rounded-2xl text-sm touch-manipulation"
          >
            Roast again
          </button>
        )}
        <button
          onClick={() => {
            const caption = groupChatCaption(roastText, style.id !== 'default' ? style.label : undefined);
            navigator.clipboard.writeText(caption);
            trackEvent('copy_share_text', { style: styleId });
            markEngaged();
            alert('Caption copied — paste into iMessage or the group chat.');
          }}
          className="w-full min-h-[44px] text-xs text-zinc-400 active:text-white touch-manipulation"
        >
          Copy caption for iMessage
        </button>
        <button
          onClick={async () => {
            try {
              await copyInviteLink(getBrowserId());
              setInviteState('copied');
              trackEvent('referral_copied', { source: 'card' });
              markEngaged();
            } catch {
              alert('Could not copy the invite link.');
            }
          }}
          className="w-full min-h-[44px] text-xs text-emerald-400 active:text-emerald-300 touch-manipulation"
        >
          {inviteState === 'copied' ? 'Invite link copied ✓' : 'Copy invite link — +5 if they buy'}
        </button>
        <button
          onClick={submitFeature}
          disabled={!cardUrl || submitState === 'saving' || submitState === 'saved'}
          className="w-full min-h-[40px] text-xs text-zinc-600 active:text-zinc-400 touch-manipulation disabled:opacity-50"
        >
          {submitState === 'saved' ? 'Submitted for feature ✓' : submitState === 'saving' ? 'Submitting…' : 'Submit roast for feature (anonymous)'}
        </button>
        {isOwner && onPostToX && (
          <button
            onClick={onPostToX}
            className="w-full min-h-[44px] bg-sky-900/50 border border-sky-700 text-sky-300 rounded-xl text-xs font-semibold touch-manipulation"
          >
            Post as @roastlyapp (owner)
          </button>
        )}
      </div>
    </div>
  );
}

export async function postCardToX(imageUrl: string, roastText: string, vibe: string, styleId: RoastStyleId) {
  const style = getRoastStyle(styleId);
  const imageBase64 = await generateRoastCardImage(imageUrl, roastText, {
    isUplifting: vibe === 'uplifting',
    styleLabel: style.id === 'default' ? null : style.label,
    styleAccent: style.accent,
  });
  let caption = `${roastText.trim()}\n\n${getJuly4PromoHook()}Roast anything with Grok → roastly-app.vercel.app\n\n#Roastly #Grok #AI #Roast`;
  if (caption.length > 280) caption = caption.slice(0, 277) + '...';
  const res = await fetch('/api/post-to-x', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-roastly-browser-id': getBrowserId(),
    },
    body: JSON.stringify({ text: caption, imageBase64 }),
  });
  const data = await res.json().catch(() => ({}));
  if (res.ok && data.success) {
    alert(`Posted to X! View: ${data.url || 'Check your X account'}`);
  } else {
    alert(data.error || `Failed to post to X (status ${res.status}). Make sure X API keys are configured in Vercel.`);
  }
}

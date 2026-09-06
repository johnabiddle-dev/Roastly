'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import RoastCard, { postCardToX } from '@/components/RoastCard';
import UpgradeModal from '@/components/UpgradeModal';
import { DEFAULT_STYLE_ID, ROAST_STYLES, getRoastStyle, isPaidUser, type RoastStyleId } from '@/lib/roast-styles';
import { copyInviteLink, shareButtonLabel, shareOrCopyCard } from '@/lib/share';
import { getBrowserId, startCheckout } from '@/lib/client';
import { USAGE_VERSION } from '@/lib/constants';
import type { UsageStatus } from '@/lib/types';
import { getFreeLimit, getJuly4PromoBanner } from '@/lib/promo';
import { trackEvent } from '@/lib/analytics';

const HEAT = [
  { value: 'crispy', label: 'Crispy' },
  { value: 'medium_rare', label: 'Medium Rare' },
  { value: 'light_toast', label: 'Light Toast' },
  { value: 'uplifting', label: 'Uplifting' },
] as const;

const STEPS = [
  { key: 'analyzing', label: 'Analyzing' },
  { key: 'cooking', label: 'Cooking' },
  { key: 'writing', label: 'Writing burns' },
];

const FORMAT_ERROR = "This image format isn't supported. Try taking a new photo or saving it as a JPEG first.";

function getClientFreeUsed(browserId: string): number {
  return parseInt(localStorage.getItem(`roastly-${USAGE_VERSION}-free-used-${browserId}`) || '0', 10);
}

function setClientFreeUsed(browserId: string, used: number) {
  localStorage.setItem(`roastly-${USAGE_VERSION}-free-used-${browserId}`, String(used));
}

function fileKey(file: File) {
  return `${file.name}|${file.size}|${file.lastModified}`;
}

function canAutoStart(usage: UsageStatus | null) {
  if (!usage || (usage.credits ?? 0) > 0) return !usage || usage.remaining > 0;
  return usage.remaining > 0;
}

function resizeToJpeg(file: File, maxSize = 768): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        try {
          let { width, height } = img;
          if (width > maxSize || height > maxSize) {
            if (width > height) {
              height = Math.round((maxSize / width) * height);
              width = maxSize;
            } else {
              width = Math.round((maxSize / height) * width);
              height = maxSize;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject(new Error('Canvas context not available'));
          ctx.drawImage(img, 0, 0, width, height);
          const base64 = canvas.toDataURL('image/jpeg', 0.78).split(',')[1];
          if (!base64) return reject(new Error(FORMAT_ERROR));
          resolve(base64);
        } catch {
          reject(new Error(FORMAT_ERROR));
        }
      };
      img.onerror = () => reject(new Error(FORMAT_ERROR));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error(FORMAT_ERROR));
    reader.readAsDataURL(file);
  });
}

export default function RoastPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingMessage, setGeneratingMessage] = useState('');
  const [stepIndex, setStepIndex] = useState(0);
  const [roasts, setRoasts] = useState<string[]>([]);
  const [showCard, setShowCard] = useState(false);
  const [selectedRoast, setSelectedRoast] = useState('');
  const [vibe, setVibe] = useState<(typeof HEAT)[number]['value']>('crispy');
  const [styleId, setStyleId] = useState<RoastStyleId>(DEFAULT_STYLE_ID);
  const [customPrompt, setCustomPrompt] = useState('');
  const [showCustomize, setShowCustomize] = useState(false);
  const [usage, setUsage] = useState<UsageStatus | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [firstRoastOffer, setFirstRoastOffer] = useState(false);
  const [limitBanner, setLimitBanner] = useState(false);
  const [paidBanner, setPaidBanner] = useState(false);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [autoHint, setAutoHint] = useState(false);
  const [styleIntent, setStyleIntent] = useState<string | null>(null);
  const [pickedIndex, setPickedIndex] = useState(0);
  const [resultsShare, setResultsShare] = useState<'idle' | 'saving' | 'shared' | 'copied' | 'downloaded' | 'error'>('idle');
  const [inviteState, setInviteState] = useState<'idle' | 'copied'>('idle');

  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generatingRef = useRef(false);
  const lastAutoKey = useRef<string | null>(null);
  const fileRef = useRef<File | null>(null);
  const usageRef = useRef<UsageStatus | null>(null);
  const vibeRef = useRef(vibe);
  const styleRef = useRef(styleId);
  const promptRef = useRef(customPrompt);
  const generateRef = useRef<(source?: string) => Promise<void>>(async () => {});

  useEffect(() => { usageRef.current = usage; }, [usage]);
  useEffect(() => { fileRef.current = selectedFile; }, [selectedFile]);
  useEffect(() => { vibeRef.current = vibe; }, [vibe]);
  useEffect(() => { styleRef.current = styleId; }, [styleId]);
  useEffect(() => { promptRef.current = customPrompt; }, [customPrompt]);

  const paid = isPaidUser(usage);

  const clearAuto = useCallback(() => {
    if (autoTimer.current) {
      clearTimeout(autoTimer.current);
      autoTimer.current = null;
    }
    setAutoHint(false);
  }, []);

  const fetchUsage = useCallback(async () => {
    try {
      const headers: Record<string, string> = { 'x-roastly-browser-id': getBrowserId() };
      const storedReferrer = localStorage.getItem('roastly-referrer');
      if (storedReferrer) headers['x-roastly-referrer'] = storedReferrer;
      const res = await fetch('/api/usage', { headers });
      const data = await res.json();
      const browserId = getBrowserId();
      const credits = data.credits ?? 0;
      if (data && credits === 0) {
        const clientUsed = getClientFreeUsed(browserId);
        const limit = data.limit || getFreeLimit();
        if (clientUsed > (data.used || 0)) {
          const remaining = Math.max(0, limit - clientUsed);
          setUsage({ ...data, used: clientUsed, freeRemaining: remaining, remaining: remaining + credits, limit, credits });
        } else {
          setClientFreeUsed(browserId, data.used || 0);
          setUsage(data);
        }
      } else {
        setUsage(data);
      }
    } catch (err) {
      console.error('Failed to fetch usage', err);
    }
  }, []);

  useEffect(() => {
    const browserId = getBrowserId();
    let openUpgrade = false;
    let paidOk = false;
    const url = new URL(window.location.href);
    const ref = url.searchParams.get('ref');
    if (ref && ref !== browserId) localStorage.setItem('roastly-referrer', ref);
    if (url.searchParams.get('upgrade') === '1') openUpgrade = true;
    if (url.searchParams.get('paid') === '1') paidOk = true;
    url.searchParams.delete('ref');
    url.searchParams.delete('upgrade');
    url.searchParams.delete('paid');
    window.history.replaceState({}, '', url.toString());
    const t = setTimeout(() => {
      if (openUpgrade) setShowUpgrade(true);
      if (paidOk) setPaidBanner(true);
      fetchUsage();
    }, 0);
    return () => clearTimeout(t);
  }, [fetchUsage]);

  const scheduleAuto = useCallback((file: File) => {
    const key = fileKey(file);
    if (lastAutoKey.current === key || generatingRef.current) return;
    if (autoTimer.current) {
      clearTimeout(autoTimer.current);
      autoTimer.current = null;
    }
    if (!canAutoStart(usageRef.current)) {
      setAutoHint(false);
      return;
    }
    lastAutoKey.current = key;
    setAutoHint(true);
    autoTimer.current = setTimeout(() => {
      autoTimer.current = null;
      setAutoHint(false);
      if (fileRef.current !== file || generatingRef.current) return;
      if (canAutoStart(usageRef.current)) generateRef.current('auto');
    }, 1000);
  }, []);

  const selectFile = useCallback((file: File, source: string) => {
    clearAuto();
    lastAutoKey.current = null;
    setError('');
    setRoasts([]);
    setSelectedFile(file);
    fileRef.current = file;
    setPreviewUrl(null);
    setShowCustomize(false);
    setShowCard(false);
    setSelectedRoast('');
    trackEvent('photo_selected', { source, sizeKb: Math.round(file.size / 1024), type: (file.type || 'unknown').slice(0, 40) });
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewUrl(event.target?.result as string);
      scheduleAuto(file);
    };
    reader.onerror = () => {
      setError(FORMAT_ERROR);
      trackEvent('generate_failed', { error: 'preview_read_failed' });
    };
    reader.readAsDataURL(file);
  }, [clearAuto, scheduleAuto]);

  const generate = useCallback(async (source = 'button') => {
    const file = fileRef.current;
    if (!file || generatingRef.current) return;
    clearAuto();
    lastAutoKey.current = fileKey(file);
    const currentVibe = vibeRef.current;
    const currentStyle = styleRef.current;
    const currentPrompt = promptRef.current;
    const currentUsage = usageRef.current;
    trackEvent('generate_clicked', { source, vibe: currentVibe, remaining: currentUsage?.remaining ?? -1 });
    generatingRef.current = true;
    setIsGenerating(true);
    setStepIndex(0);
    setError('');
    const messages = [
      'Analyzing every pixel...',
      'Grok is cooking...',
      'Finding the weak spots...',
      'Reading the room...',
      'Crafting elite burns...',
    ];
    setGeneratingMessage(messages[0]);
    let msgIndex = 0;
    let step = 0;
    const interval = setInterval(() => {
      msgIndex = (msgIndex + 1) % messages.length;
      setGeneratingMessage(messages[msgIndex]);
      if (msgIndex % 2 === 0 && step < STEPS.length - 1) {
        step += 1;
        setStepIndex(step);
      }
    }, 420);
    const started = Date.now();
    try {
      const browserId = getBrowserId();
      const clientUsed = getClientFreeUsed(browserId);
      if (currentUsage && currentUsage.remaining <= 0) {
        setShowUpgrade(true);
        trackEvent('generate_failed', { error: 'limit_precheck', source });
        return;
      }
      let base64: string;
      try {
        base64 = await resizeToJpeg(file);
      } catch (err) {
        const message = err instanceof Error ? err.message : FORMAT_ERROR;
        setError(message.includes("isn't supported") ? message : FORMAT_ERROR);
        trackEvent('generate_failed', { error: 'image_decode', source, ms: Date.now() - started });
        return;
      }
      const styleToSend = isPaidUser(currentUsage) ? currentStyle : DEFAULT_STYLE_ID;
      trackEvent('generate_started', { source, vibe: currentVibe, style: styleToSend });
      const response = await fetch('/api/generate-roast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-roastly-browser-id': getBrowserId(),
        },
        body: JSON.stringify({
          imageBase64: base64,
          vibe: currentVibe,
          style: styleToSend,
          customPrompt: currentPrompt.trim() || undefined,
        }),
      });
      const data = await response.json().catch(() => ({}));
      const ms = Date.now() - started;
      if (!response.ok || data.error) {
        if (data.remaining === 0 || (typeof data.error === 'string' && data.error.includes('limit')) || data.code === 'STYLE_REQUIRES_PAID') {
          setShowUpgrade(true);
        }
        setError(typeof data.error === 'string' ? data.error : 'Failed to generate roasts. Try again.');
        trackEvent('generate_failed', { error: data.code || 'api_error', status: response.status, source, ms });
        return;
      }
      if (!data.roasts || data.roasts.length === 0) {
        setError('No roasts were generated. Try again.');
        trackEvent('generate_failed', { error: 'empty_roasts', source, ms });
        return;
      }
      setRoasts(data.roasts);
      setSelectedRoast(data.roasts[0]);
      setShowCard(true);
      setStepIndex(STEPS.length - 1);
      trackEvent('roast_card_opened', { index: 0, source: 'auto' });
      const usedCredits = (currentUsage?.credits ?? 0) > 0;
      if (!usedCredits) setClientFreeUsed(browserId, clientUsed + 1);
      trackEvent('generate_succeeded', { source, vibe: currentVibe, style: styleToSend, count: data.roasts.length, ms });
      trackEvent('roast_generated', { vibe: currentVibe, style: styleToSend, count: data.roasts.length });
      await fetchUsage();
      if (!usedCredits && clientUsed + 1 >= getFreeLimit()) setLimitBanner(true);
      else if (clientUsed === 0 && !usedCredits) setFirstRoastOffer(true);
    } catch (err) {
      console.error(err);
      setError('Something went wrong while generating roasts.');
      trackEvent('generate_failed', { error: 'network', source, ms: Date.now() - started });
    } finally {
      clearInterval(interval);
      setGeneratingMessage('');
      setIsGenerating(false);
      generatingRef.current = false;
    }
  }, [clearAuto, fetchUsage]);

  useEffect(() => {
    generateRef.current = generate;
  }, [generate]);

  useEffect(() => {
    if (!selectedFile || !previewUrl || roasts.length > 0 || generatingRef.current || autoTimer.current) return;
    if (lastAutoKey.current === fileKey(selectedFile)) return;
    if (canAutoStart(usage)) scheduleAuto(selectedFile);
  }, [usage, selectedFile, previewUrl, roasts.length, scheduleAuto]);

  const resetUpload = () => {
    clearAuto();
    lastAutoKey.current = null;
    setSelectedFile(null);
    fileRef.current = null;
    setPreviewUrl(null);
    setRoasts([]);
    setError('');
    setCustomPrompt('');
    setShowCustomize(false);
    setShowCard(false);
    setSelectedRoast('');
  };

  const usageLabel = () => {
    if (!usage) return 'Loading...';
    if (usage.remaining > 100000) return 'Unlimited (owner)';
    const free = usage.freeRemaining ?? (usage.isPaid ? 0 : usage.remaining);
    const credits = usage.credits ?? (usage.isPaid ? usage.remaining : 0);
    if (credits > 0 && free > 0) return `${free} free + ${credits} credits left`;
    if (credits > 0) return `${credits} roast credit${credits === 1 ? '' : 's'} left`;
    return `${free} free left`;
  };

  const remainingLine = () => {
    if (!usage || usage.remaining > 100000) return null;
    const free = usage.freeRemaining ?? (usage.isPaid ? 0 : usage.remaining);
    const credits = usage.credits ?? 0;
    return credits > 0 ? `${credits} credit${credits === 1 ? '' : 's'} left` : `${free} of ${usage.limit || getFreeLimit()} free left`;
  };

  const checkout = async (priceId: string) => {
    setCheckingOut(priceId);
    try {
      const result = await startCheckout(priceId, styleIntent ? 'style_lock' : 'upgrade_modal');
      if (result.url) {
        setShowUpgrade(false);
        window.location.href = result.url;
      } else {
        alert(result.error || 'Something went wrong');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setCheckingOut(null);
    }
  };

  const unlockStyle = (id: string) => {
    setStyleIntent(id);
    setFirstRoastOffer(false);
    setLimitBanner(false);
    setShowUpgrade(true);
  };

  const customize = (
    <div className="space-y-4 pt-2 border-t border-zinc-800/80">
      {paid ? (
        <div>
          <p className="text-sm text-zinc-400 mb-2 text-center">Roast style</p>
          <div className="flex flex-wrap justify-center gap-2">
            {ROAST_STYLES.map((style) => {
              const active = styleId === style.id;
              return (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => {
                    setStyleId(style.id);
                    trackEvent('style_selected', { style: style.id });
                  }}
                  className={`min-h-[44px] px-3.5 py-2 rounded-full text-sm font-medium transition-colors active:scale-[0.985] touch-manipulation border ${
                    active ? 'text-white border-transparent' : 'bg-zinc-900 text-zinc-300 border-zinc-800 active:bg-zinc-800'
                  }`}
                  style={active ? { backgroundColor: style.accent, borderColor: style.accent } : undefined}
                >
                  <span className="mr-1" aria-hidden>{style.emoji}</span>
                  {style.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 text-center">
          <p className="text-[11px] text-zinc-500 leading-snug mb-2">Free uses Default. Tap a voice to unlock it.</p>
          <div className="flex flex-wrap justify-center gap-2">
            {ROAST_STYLES.filter((style) => style.paidOnly).map((style) => (
              <button
                key={style.id}
                type="button"
                onClick={() => unlockStyle(style.id)}
                className="min-h-[40px] px-3 rounded-full text-xs font-medium bg-zinc-950 border border-zinc-800 text-zinc-300 touch-manipulation"
              >
                {style.emoji} {style.label} 🔒
              </button>
            ))}
          </div>
        </div>
      )}
      <div>
        <p className="text-sm text-zinc-400 mb-2 text-center">Heat level</p>
        <div className="flex flex-wrap justify-center gap-2">
          {HEAT.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setVibe(option.value)}
              className={`min-h-[44px] min-w-[72px] px-3.5 py-2 rounded-full text-sm font-medium transition-colors active:scale-[0.985] touch-manipulation ${
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
      {usage?.hasCustomPrompts ? (
        <div>
          <p className="text-sm text-emerald-400 mb-1 text-center">Custom instructions</p>
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="e.g. Focus on the awkward replies in this chat."
            className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-3 text-base text-white placeholder:text-zinc-500 min-h-[72px] resize-y"
          />
        </div>
      ) : paid ? (
        <div className="text-center">
          <button type="button" onClick={() => setShowUpgrade(true)} className="text-xs text-emerald-400 hover:text-emerald-300 underline">
            Unlock custom prompts for $1.99 →
          </button>
        </div>
      ) : null}
    </div>
  );

  const goRoast = (source: string) => {
    clearAuto();
    if (usage && usage.remaining <= 0) setShowUpgrade(true);
    else generate(source);
  };

  const activeStyle = getRoastStyle(styleId);
  const pickedRoast = roasts[pickedIndex] ?? roasts[0];
  const mobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent || '');

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-28 sm:pb-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 sm:py-12">
        <div className={`text-center ${roasts.length > 0 ? 'mb-4' : 'mb-5 sm:mb-8'}`}>
          {getJuly4PromoBanner() && !roasts.length && !previewUrl && (
            <div className="mb-4 mx-auto max-w-lg px-3 py-2.5 rounded-2xl bg-red-950/60 border border-red-600/50 text-red-200 text-xs sm:text-base font-medium">
              {getJuly4PromoBanner()}
            </div>
          )}
          {paidBanner && roasts.length === 0 && (
            <div className="mb-4 mx-auto max-w-lg px-3 py-2.5 rounded-2xl bg-emerald-950/60 border border-emerald-600/50 text-emerald-200 text-xs sm:text-sm font-medium">
              Styles unlocked. Pick Gym Bro, British, Street… after you upload.
            </div>
          )}
          {roasts.length === 0 && !previewUrl && (
            <>
              <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 mb-2">Built for group chats · under a few seconds</p>
              <h1 className="text-3xl sm:text-5xl font-bold tracking-tighter mb-2 sm:mb-4">Upload. Get roasted. Drop it in the chat.</h1>
              <p className="text-base sm:text-xl text-zinc-400 max-w-md mx-auto">Screenshot, selfie, group chat, pet — Grok cooks it fast</p>
              <div className="flex justify-center gap-2 mt-4 text-[10px] sm:text-xs text-zinc-500">
                <span className="px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800">1. Upload</span>
                <span className="px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800">2. Roast</span>
                <span className="px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800">3. Send</span>
              </div>
            </>
          )}
          {roasts.length === 0 && previewUrl && !isGenerating && (
            <p className="text-sm text-zinc-400">Looks good? Hit roast.</p>
          )}
        </div>

        {roasts.length > 0 && previewUrl ? (
          <div className="space-y-8">
            <div className="flex justify-center gap-2 text-[10px] sm:text-xs">
              <span className="px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">1. Upload ✓</span>
              <span className="px-2.5 py-1 rounded-full bg-red-600/20 text-red-300 border border-red-600/50 font-medium">2. Pick roast</span>
              <span className="px-2.5 py-1 rounded-full bg-zinc-900 text-zinc-600 border border-zinc-800">3. Send the card</span>
            </div>
            <section>
              <p className="text-center text-sm text-zinc-400 mb-4">
                Your card — {mobile ? 'send it' : 'copy it'} to iMessage or the group chat
              </p>
              <div
                className={`bg-zinc-950 rounded-3xl border-2 ${vibe === 'uplifting' ? 'border-emerald-600/50' : 'border-red-600/40'} overflow-hidden`}
                style={activeStyle.id !== 'default' && vibe !== 'uplifting' ? { borderColor: activeStyle.accent } : undefined}
              >
                {activeStyle.id !== 'default' && (
                  <div className="pt-3 flex justify-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full text-zinc-950" style={{ backgroundColor: activeStyle.accent }}>
                      {activeStyle.label}
                    </span>
                  </div>
                )}
                <img src={previewUrl} alt="" className="w-full max-h-[180px] sm:max-h-[240px] object-cover" decoding="async" />
                <div className="px-5 py-5 sm:px-7 sm:py-6 text-center whitespace-pre-line">
                  <p className="text-white text-lg sm:text-2xl font-bold leading-snug tracking-tight">{pickedRoast}</p>
                </div>
                <div className="pb-4 text-center">
                  <p className="text-[9px] text-zinc-600 tracking-[2px]">{vibe === 'uplifting' ? 'UPLIFTED BY' : 'ROASTED BY'}</p>
                  <p className={`${vibe === 'uplifting' ? 'text-emerald-500' : 'text-red-500'} font-bold text-sm`}>SAUCY GROK</p>
                </div>
              </div>
            </section>
            <section>
              <div className="flex items-center justify-between mb-3 px-1">
                <p className="text-xs uppercase tracking-wider text-zinc-500">
                  Choose your card ({activeStyle.id !== 'default' ? activeStyle.label : HEAT.find((h) => h.value === vibe)?.label})
                </p>
                <p className="text-xs text-zinc-600">{roasts.length} options</p>
              </div>
              <div className="space-y-2">
                {roasts.map((roast, index) => {
                  const active = pickedIndex === index;
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setPickedIndex(index)}
                      className={`w-full text-left rounded-2xl p-4 transition-colors touch-manipulation min-h-[56px] ${
                        active ? 'bg-red-950/40 border-2 border-red-600/70' : 'bg-zinc-900/50 border border-zinc-800 active:bg-zinc-800/80'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center mt-0.5 ${active ? 'border-red-500 bg-red-600' : 'border-zinc-600'}`}>
                          {active && <span className="w-2 h-2 rounded-full bg-white" />}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] uppercase tracking-wide text-zinc-500 mb-1">
                            {index === 0 ? (vibe === 'uplifting' ? 'Top pick' : 'Savagest') : `Option ${index + 1}`}
                          </p>
                          <p className={`text-sm sm:text-base leading-snug whitespace-pre-line ${active ? 'text-white' : 'text-zinc-300'}`}>{roast}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={async () => {
                  setResultsShare('saving');
                  try {
                    const result = await shareOrCopyCard(previewUrl, pickedRoast, {
                      isUplifting: vibe === 'uplifting',
                      styleLabel: activeStyle.id === 'default' ? null : activeStyle.label,
                      styleAccent: activeStyle.accent,
                    });
                    setResultsShare(result);
                    trackEvent('share_group_chat', { style: styleId, source: 'results', method: result });
                  } catch (err) {
                    const e = err as { name?: string };
                    setResultsShare(e?.name === 'AbortError' ? 'idle' : 'error');
                  }
                }}
                disabled={resultsShare === 'saving'}
                className="mt-5 w-full min-h-[56px] bg-red-600 active:bg-red-500 disabled:opacity-50 text-white font-bold rounded-2xl text-base touch-manipulation"
              >
                {resultsShare === 'saving'
                  ? mobile
                    ? 'Opening iMessage…'
                    : 'Copying card…'
                  : resultsShare === 'shared'
                    ? 'Sent ✓ — they get 3 free, you get +5 if they buy'
                    : resultsShare === 'copied'
                      ? 'Card copied ✓ — paste into iMessage'
                      : resultsShare === 'downloaded'
                        ? 'Saved ✓ — send it in the chat'
                        : shareButtonLabel()}
              </button>
              <p className="mt-2 text-center text-[11px] text-zinc-500">
                Send the card, not a post. Friend buys a pack ($1 / $4.99 / $19.99) → you get +5.
              </p>
              <button
                type="button"
                onClick={() => {
                  setRoasts([]);
                  generate('regenerate');
                }}
                disabled={isGenerating}
                className="mt-2 w-full min-h-[48px] bg-zinc-800 active:bg-zinc-700 disabled:opacity-50 text-white font-semibold rounded-2xl text-sm touch-manipulation"
              >
                {isGenerating ? 'Generating…' : 'Roast again'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedRoast(pickedRoast);
                  setShowCard(true);
                  trackEvent('roast_card_opened', { index: pickedIndex });
                }}
                className="w-full min-h-[40px] text-xs text-zinc-500 active:text-zinc-300 touch-manipulation"
              >
                Preview full card
              </button>
              {!paid && (
                <div className="mt-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 px-3 py-3">
                  <p className="text-center text-[11px] text-zinc-500 mb-2">Same photo. Different voice.</p>
                  <div className="flex gap-2 overflow-x-auto pb-0.5">
                    {ROAST_STYLES.filter((s) => s.paidOnly).map((style) => (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => {
                          trackEvent('style_lock_tapped', { style: style.id });
                          unlockStyle(style.id);
                        }}
                        className="shrink-0 min-h-[40px] px-3 rounded-full text-xs font-medium bg-zinc-950 border border-zinc-800 text-zinc-300 active:bg-zinc-800 touch-manipulation"
                      >
                        <span className="mr-1" aria-hidden>{style.emoji}</span>
                        {style.label}
                        <span className="ml-1 text-zinc-600">🔒</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-center text-[10px] text-zinc-600 mt-2">$1 unlocks every style · one-time</p>
                </div>
              )}
            </section>
            <section className="space-y-3 pt-4 border-t border-zinc-800/80">
              <p className="text-xs text-zinc-500 text-center">{usageLabel()}</p>
              <button onClick={resetUpload} className="w-full min-h-[44px] bg-zinc-900 border border-zinc-700 active:bg-zinc-800 text-zinc-400 rounded-xl text-sm touch-manipulation">
                New photo
              </button>
              <button
                onClick={() => {
                  const idx = HEAT.findIndex((h) => h.value === vibe);
                  setVibe(HEAT[(idx + 1) % HEAT.length].value);
                  setRoasts([]);
                  generate('regenerate');
                }}
                disabled={isGenerating}
                className="w-full text-center text-xs text-zinc-600 py-1 touch-manipulation disabled:opacity-50"
              >
                Try a different vibe →
              </button>
              <div className="space-y-2">
                <button type="button" onClick={() => setShowCustomize((v) => !v)} className="w-full text-center text-xs text-zinc-500 py-2 touch-manipulation">
                  {showCustomize ? 'Hide customize ▲' : 'Customize heat / style ▼'}
                </button>
                {showCustomize && customize}
              </div>
              {usage && (usage.freeRemaining ?? (usage.isPaid ? 0 : usage.remaining)) > 0 && (usage.freeRemaining ?? usage.remaining) <= 1 && (usage.credits ?? 0) === 0 && (
                <p className="text-center text-xs text-zinc-500">Last free roast on this device</p>
              )}
              {(limitBanner || (usage && usage.remaining <= 0)) && (
                <div className="p-4 bg-zinc-900 border border-zinc-700 rounded-2xl text-center">
                  <p className="text-sm text-zinc-400 mb-3">
                    {usage?.isPaid || (usage?.credits ?? 0) > 0 ? "You're out of roast credits." : 'Out of free roasts — grab a credit pack?'}
                  </p>
                  <button
                    onClick={() => {
                      setStyleIntent(null);
                      setLimitBanner(!!(usage && usage.remaining <= 0));
                      setShowUpgrade(true);
                    }}
                    className="w-full min-h-[48px] bg-red-600 active:bg-red-500 text-white rounded-2xl font-bold text-sm touch-manipulation"
                  >
                    Buy credit packs
                  </button>
                </div>
              )}
              <div className="rounded-2xl border border-emerald-800/60 bg-emerald-950/30 px-4 py-5 text-center">
                <p className="text-sm font-semibold text-white mb-1">Send the card. Get +5 when they pay.</p>
                <p className="text-xs text-zinc-400 mb-3">Friends land on 3 free roasts, then packs at $1 / $4.99 / $19.99.</p>
                <button
                  onClick={async () => {
                    try {
                      await copyInviteLink(getBrowserId());
                      setInviteState('copied');
                      trackEvent('referral_copied', { source: 'results' });
                    } catch {
                      alert('Could not copy the invite link.');
                    }
                  }}
                  className="w-full min-h-[44px] bg-emerald-600/90 active:bg-emerald-500 text-white font-semibold rounded-xl text-sm touch-manipulation"
                >
                  {inviteState === 'copied' ? 'Invite link copied ✓' : 'Copy invite link — +5 if they buy'}
                </button>
                <p className="text-[10px] text-zinc-500 mt-2 leading-relaxed">No posting chores. iMessage / group chat is the growth loop.</p>
              </div>
            </section>
          </div>
        ) : previewUrl && isGenerating ? (
          <div className="space-y-6 max-w-md mx-auto">
            <div className="relative">
              <img src={previewUrl} alt="Preview" className="w-full rounded-3xl shadow-2xl opacity-60" decoding="async" />
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 rounded-3xl px-6">
                <div className="w-12 h-12 border-2 border-red-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-white font-semibold text-lg text-center mb-4">{generatingMessage || 'Generating roasts...'}</p>
                <div className="w-full max-w-xs">
                  <div className="flex justify-between mb-2">
                    {STEPS.map((step, i) => (
                      <span key={step.key} className={`text-[10px] uppercase tracking-wide ${i <= stepIndex ? 'text-red-400 font-semibold' : 'text-zinc-600'}`}>
                        {step.label}
                      </span>
                    ))}
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-red-600 rounded-full transition-all duration-500 ease-out" style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }} />
                  </div>
                </div>
              </div>
            </div>
            <p className="text-center text-xs text-zinc-500">Usually a few seconds · hang tight</p>
          </div>
        ) : previewUrl ? (
          <div className="space-y-5 max-w-md mx-auto">
            <div className="relative">
              <img src={previewUrl} alt="Preview" className="w-full rounded-3xl shadow-2xl" decoding="async" />
              <button type="button" onClick={resetUpload} className="absolute top-4 right-4 bg-black/70 text-white px-4 py-2 rounded-full text-sm min-h-[44px] touch-manipulation active:bg-black/80">
                Change photo
              </button>
            </div>
            {error && <p className="text-red-400 text-sm bg-red-950/50 p-3 rounded-xl text-center leading-snug">{error}</p>}
            <button
              type="button"
              onClick={() => goRoast('button')}
              disabled={isGenerating}
              className="w-full bg-red-600 hover:bg-red-500 active:bg-red-700 disabled:bg-zinc-700 transition-colors text-white text-xl font-bold min-h-[56px] px-8 py-4 rounded-2xl touch-manipulation active:scale-[0.985] shadow-lg shadow-red-900/30"
            >
              {usage && usage.remaining <= 0 ? 'Buy roast credits' : autoHint ? 'Roasting in a sec… tap to go now →' : 'Roast this →'}
            </button>
            <p className="text-center text-xs text-zinc-500">
              {remainingLine() || usageLabel()}
              {autoHint ? ' · auto-starting…' : ''}
            </p>
            {usage && usage.remaining <= 0 && (
              <button type="button" onClick={() => setShowUpgrade(true)} className="w-full text-emerald-400 text-sm underline touch-manipulation min-h-[40px]">
                See payment options →
              </button>
            )}
            <button type="button" onClick={() => { clearAuto(); setShowCustomize((v) => !v); }} className="w-full text-center text-xs text-zinc-600 py-2 touch-manipulation">
              {showCustomize ? 'Hide options ▲' : 'More options (heat, style) ▼'}
            </button>
            {showCustomize && customize}
          </div>
        ) : (
          <div
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file && file.type.startsWith('image/')) selectFile(file, 'drop');
            }}
            onDragOver={(e) => e.preventDefault()}
            onDragEnter={(e) => e.preventDefault()}
            className="border-2 border-dashed border-zinc-700 rounded-3xl p-5 sm:p-12 text-center hover:border-red-600/50 active:border-red-500/50 transition-colors"
          >
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 mb-5 text-left">
              <p className="text-[10px] text-red-400 uppercase tracking-wide mb-1">Example roast</p>
              <p className="text-sm sm:text-base text-zinc-200 leading-snug">“That outfit is fighting for its life harder than your attempt to look rich.”</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex flex-col items-center justify-center w-full min-h-[100px] bg-red-600 active:bg-red-700 rounded-2xl font-bold text-base sm:text-lg cursor-pointer touch-manipulation transition-colors px-4">
                <span className="text-2xl mb-1">🖼️</span>
                <span>Choose photo or screenshot</span>
                <input type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) selectFile(file, 'gallery'); e.target.value = ''; }} className="hidden" />
              </label>
              <label className="flex flex-col items-center justify-center w-full min-h-[100px] bg-zinc-800 active:bg-zinc-700 border border-zinc-600 rounded-2xl font-bold text-base sm:text-lg cursor-pointer touch-manipulation transition-colors px-4">
                <span className="text-2xl mb-1">📸</span>
                <span>Take a new photo</span>
                <input type="file" accept="image/*" capture="environment" onChange={(e) => { const file = e.target.files?.[0]; if (file) selectFile(file, 'camera'); e.target.value = ''; }} className="hidden" />
              </label>
            </div>
            <p className="text-xs text-zinc-500 mt-3">Free — {getFreeLimit()} roasts · no signup</p>
          </div>
        )}
      </div>

      {showCard && previewUrl && selectedRoast && (
        <RoastCard
          key={`${selectedRoast}-${styleId}-${vibe}`}
          imageUrl={previewUrl}
          roastText={selectedRoast}
          vibe={vibe}
          styleId={paid ? styleId : DEFAULT_STYLE_ID}
          isUplifting={vibe === 'uplifting'}
          onClose={() => setShowCard(false)}
          onPostToX={usage && usage.remaining > 100000 ? () => postCardToX(previewUrl, selectedRoast, vibe, styleId).catch((e) => { console.error(e); alert('Network or unexpected error posting to X.'); }) : undefined}
          isOwner={!!(usage && usage.remaining > 100000)}
          onEngaged={() => {
            if (firstRoastOffer) {
              setFirstRoastOffer(false);
              setShowUpgrade(true);
            }
          }}
          onRoastAgain={() => {
            setShowCard(false);
            setSelectedRoast('');
            setRoasts([]);
            generate('regenerate');
          }}
        />
      )}

      {showUpgrade && (
        <UpgradeModal
          usage={usage}
          onClose={() => {
            setShowUpgrade(false);
            setFirstRoastOffer(false);
            setLimitBanner(false);
            setStyleIntent(null);
          }}
          onCheckout={checkout}
          isCheckingOut={checkingOut}
          showFirstRoastOffer={firstRoastOffer && !limitBanner && !styleIntent}
          limitReached={!styleIntent && (limitBanner || !!(usage && usage.remaining <= 0))}
          styleIntent={styleIntent}
        />
      )}

      {previewUrl && !roasts.length && !isGenerating && (
        <div className="fixed bottom-0 left-0 right-0 z-40 sm:hidden bg-zinc-950/95 border-t border-zinc-800 px-4 py-3 pb-safe backdrop-blur-md">
          <button type="button" onClick={() => goRoast('sticky')} className="w-full min-h-[52px] bg-red-600 active:bg-red-500 text-white rounded-2xl font-bold text-base touch-manipulation">
            {usage && usage.remaining <= 0 ? 'Buy credits →' : 'Roast this →'}
          </button>
        </div>
      )}
      {isGenerating && (
        <div className="fixed bottom-0 left-0 right-0 z-40 sm:hidden bg-zinc-950/95 border-t border-zinc-800 px-4 py-3 pb-safe backdrop-blur-md">
          <p className="text-center text-sm text-zinc-300 font-medium">{generatingMessage || 'Cooking your roast…'}</p>
          <div className="mt-2 h-1 bg-zinc-800 rounded-full overflow-hidden max-w-xs mx-auto">
            <div className="h-full bg-red-600 rounded-full transition-all duration-500" style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}

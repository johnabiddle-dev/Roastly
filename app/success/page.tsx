'use client';

import { useEffect, useState } from 'react';
import { getBrowserId } from '@/lib/client';

export default function SuccessPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get('session_id');
    if (!sessionId) {
      // Client-only URL parse; no session means this page was opened without checkout.
      queueMicrotask(() => {
        setStatus('error');
        setMessage('No payment session found.');
      });
      return;
    }

    const markAsPaid = async () => {
      try {
        const res = await fetch('/api/mark-paid', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-roastly-browser-id': getBrowserId(),
          },
          body: JSON.stringify({
            sessionId,
            referredBy: localStorage.getItem('roastly-referrer') || undefined,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          setStatus('success');
          const label = data.purchaseLabel || 'your purchase';
          if (data.isCustomPromptsAddOn) {
            setMessage(`Thank you! ${label} activated. You can now write custom roast instructions.`);
          } else {
            setMessage(`Thank you! ${label} activated. Credits stay on this device. No daily cap.`);
          }
        } else {
          setStatus('error');
          setMessage(data.error || 'We could not activate your credits. Please contact support.');
        }
      } catch {
        setStatus('error');
        setMessage('Something went wrong while activating your purchase. Please contact support.');
      }
    };

    markAsPaid();
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <h1 className="text-4xl font-bold mb-4">Payment Successful!</h1>
        {status === 'loading' && <p className="text-xl text-zinc-400 mb-8">Activating your purchase...</p>}
        {status === 'success' && <p className="text-xl text-emerald-400 mb-8">{message}</p>}
        {status === 'error' && <p className="text-xl text-red-400 mb-8">{message}</p>}
        <a
          href="/roast?paid=1"
          className="inline-block min-h-[48px] bg-red-600 active:bg-red-500 px-8 py-3 rounded-2xl font-semibold touch-manipulation"
        >
          Start roasting
        </a>
        <p className="text-xs text-zinc-500 mt-6">One-time purchase. Credits stay on this device. No daily cap.</p>
      </div>
    </div>
  );
}

'use client';
import { track } from "@vercel/analytics";

import { useEffect, useState } from 'react';

export default function SuccessPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Get session_id from URL using client-side method to avoid useSearchParams + Suspense requirement
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');

    if (!sessionId) {
      setStatus('error');
      setMessage('No payment session found.');
      return;
    }

    const markAsPaid = async () => {
      try {
        // Get or create browser ID (same as usage tracking)
        let browserId = localStorage.getItem('roastly-browser-id');
        if (!browserId) {
          browserId = crypto.randomUUID();
          localStorage.setItem('roastly-browser-id', browserId);
        }

        const res = await fetch('/api/mark-paid', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-roastly-browser-id': browserId,
          },
          body: JSON.stringify({ sessionId }),
        });

        const data = await res.json();

        if (res.ok) {
          setStatus('success');
          track('purchase_completed', { label: data.purchaseLabel || 'unknown' });
          const label = data.purchaseLabel || 'your purchase';
          const subNote = data.isSubscription
            ? ' This is a recurring monthly subscription.'
            : ' This is a one-time purchase.';
          setMessage(`Thank you! ${label} activated.${subNote} You now get the paid daily limit: up to 10 roasts per day on this device (instead of the free 3 total).`);
        } else {
          setStatus('error');
          setMessage(data.error || 'We could not activate your paid benefits. Please contact support.');
        }
      } catch (error) {
        setStatus('error');
        setMessage('Something went wrong while activating your paid benefits. Please contact support.');
      }
    };

    markAsPaid();
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <h1 className="text-4xl font-bold mb-4">Payment Successful!</h1>

        {status === 'loading' && (
          <p className="text-xl text-zinc-400 mb-8">Activating your purchase...</p>
        )}

        {status === 'success' && (
          <p className="text-xl text-emerald-400 mb-8">{message}</p>
        )}

        {status === 'error' && (
          <p className="text-xl text-red-400 mb-8">{message}</p>
        )}

        <a 
          href="/" 
          className="inline-block bg-red-600 hover:bg-red-500 px-8 py-3 rounded-2xl font-semibold"
        >
          Back to Roastly
        </a>

        <p className="text-xs text-zinc-500 mt-6">
          Paid plans give you 10 roasts per day (capped). Limits are tracked per device/browser.
        </p>
      </div>
    </div>
  );
}

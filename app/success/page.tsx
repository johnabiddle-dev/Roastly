'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
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
          setMessage('Thank you! Your account has been upgraded to Pro Daily (10 roasts per day). The limit is now active on this device.');
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
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <h1 className="text-4xl font-bold mb-4">Payment Successful!</h1>

        {status === 'loading' && (
          <p className="text-xl text-zinc-400 mb-8">Activating your Pro Daily benefits...</p>
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
          Pro Daily gives you 10 roasts per day. Limits are tracked per device/browser.
        </p>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">Loading...</div>}>
      <SuccessContent />
    </Suspense>
  );
}

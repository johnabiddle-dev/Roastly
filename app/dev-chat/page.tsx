'use client';

import { useState, useEffect, useRef } from 'react';

interface Message {
  id: number;
  text: string;
  timestamp: string;
  source?: string;
}

const STORAGE_KEY = 'roastly-dev-chat-messages';

export default function DevChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isOwner, setIsOwner] = useState<boolean | null>(null);
  const [liveMessages, setLiveMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load from localStorage + handle shareable URL hash on mount
  useEffect(() => {
    // Try to load from URL hash first (for cross-device sync via link)
    const hash = window.location.hash;
    if (hash.startsWith('#chat=')) {
      try {
        const encoded = hash.replace('#chat=', '');
        const json = decodeURIComponent(escape(atob(encoded)));
        const imported = JSON.parse(json) as Message[];
        if (Array.isArray(imported) && imported.length > 0) {
          setMessages(imported);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(imported));
          // Clean the hash after loading so it doesn't stay in history
          window.history.replaceState(null, '', window.location.pathname);
          return;
        }
      } catch (e) {
        console.warn('Failed to load chat from URL hash', e);
      }
    }

    // Fallback to localStorage
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Message[];
        if (Array.isArray(parsed)) {
          setMessages(parsed);
        }
      } catch (e) {
        console.warn('Failed to parse saved chat', e);
      }
    }
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Persist to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  // Owner check (same UUID as the main app's unlimited access)
  useEffect(() => {
    const checkOwner = async () => {
      let browserId = localStorage.getItem("roastly-browser-id");
      if (!browserId) {
        browserId = crypto.randomUUID();
        localStorage.setItem("roastly-browser-id", browserId);
      }

      try {
        const res = await fetch("/api/is-owner", {
          headers: {
            "x-roastly-browser-id": browserId,
          },
        });
        const data = await res.json();
        setIsOwner(!!data.isOwner);
      } catch (e) {
        setIsOwner(false);
      }
    };

    checkOwner();
  }, []);

  // Live fetch for messages (polling for "live" feel)
  const fetchLiveMessages = async () => {
    try {
      const browserId = localStorage.getItem("roastly-browser-id") || "";
      const res = await fetch("/api/dev-chat", {
        headers: {
          "x-roastly-browser-id": browserId,
        },
      });
      if (!res.ok) {
        console.warn("Failed to fetch live messages", res.status);
        return;
      }
      const data = await res.json();
      if (data.messages) {
        setLiveMessages(data.messages);
      }
    } catch (e) {
      // silent fail for polling
    }
  };

  useEffect(() => {
    if (isOwner) {
      fetchLiveMessages();
      const interval = setInterval(fetchLiveMessages, 5000); // poll every 5s for live updates
      return () => clearInterval(interval);
    }
  }, [isOwner]);

  const addMessage = (text: string) => {
    if (!text.trim()) return;

    const newMessage: Message = {
      id: Date.now(),
      text: text.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInput('');
  };

  // Live send to Grok (posts to API, appears in log for me to see immediately)
  const sendLiveToGrok = async (text: string) => {
    if (!text.trim()) return;

    setIsSending(true);
    try {
      const browserId = localStorage.getItem("roastly-browser-id") || "";
      const res = await fetch("/api/dev-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-roastly-browser-id": browserId,
        },
        body: JSON.stringify({ text: text.trim() }),
      });

      if (res.ok) {
        // Refresh live messages immediately
        await fetchLiveMessages();
        setInput('');
        // Also keep in local scratchpad for history
        addMessage(text.trim());
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(`Failed to send live message: ${errData.error || 'Unknown error. Try again.'}`);
      }
    } catch (e) {
      alert("Error sending message. Check connection.");
    } finally {
      setIsSending(false);
    }
  };

  const handleSend = () => {
    // Use live send for real-time delivery to me
    sendLiveToGrok(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const deleteMessage = (id: number) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  };

  const clearAll = () => {
    if (confirm('Clear entire dev chat? This cannot be undone.')) {
      setMessages([]);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  // Create a shareable link with all messages embedded (great for phone <-> computer)
  const copyShareableLink = async () => {
    if (messages.length === 0) {
      alert('No messages to share yet.');
      return;
    }

    try {
      const json = JSON.stringify(messages);
      const encoded = btoa(unescape(encodeURIComponent(json)));
      const url = `${window.location.origin}${window.location.pathname}#chat=${encoded}`;
      
      await navigator.clipboard.writeText(url);
      alert('Shareable link copied!\n\nSend this URL to your other device (phone/computer) via iMessage/AirDrop/etc. Opening it will load the full chat.');
    } catch (err) {
      alert('Failed to copy link. Your browser may not support it.');
    }
  };

  // Export as plain text (easy to paste into this Grok chat)
  const copyAsText = async () => {
    if (messages.length === 0) {
      alert('Nothing to copy yet.');
      return;
    }

    const lines = messages.map((m) => {
      const date = new Date(m.timestamp).toLocaleString();
      return `[${date}] ${m.text}`;
    });

    const fullLog = `=== Roastly Dev Chat Log ===\n${lines.join('\n\n')}\n=== End of log ===\n\n(Paste the above into our conversation when you're on the computer)`;

    await navigator.clipboard.writeText(fullLog);
    alert('Full log copied as text! Paste it here in our chat when you get to the computer.');
  };

  // Import from pasted JSON or text log
  const importFromText = () => {
    const pasted = prompt(
      'Paste the JSON array or the full text log you copied from the other device:'
    );
    if (!pasted) return;

    setIsImporting(true);

    try {
      // Try JSON first (from the shareable link or export)
      let imported: Message[] = [];
      const trimmed = pasted.trim();

      if (trimmed.startsWith('[')) {
        imported = JSON.parse(trimmed);
      } else {
        // Try to parse the human-readable log format
        const logLines = trimmed.split('\n').filter((line) => line.trim());
        imported = logLines
          .map((line, index) => {
            const match = line.match(/^\[(.+?)\]\s*(.+)$/);
            if (match) {
              return {
                id: Date.now() + index,
                text: match[2].trim(),
                timestamp: new Date(match[1]).toISOString(),
              };
            }
            return null;
          })
          .filter(Boolean) as Message[];
      }

      if (imported.length > 0) {
        // Merge with existing (or replace?)
        const shouldReplace = confirm(
          `Import ${imported.length} message(s)?\n\nOK = Replace current log\nCancel = Append to current log`
        );

        if (shouldReplace) {
          setMessages(imported);
        } else {
          setMessages((prev) => [...prev, ...imported]);
        }
        alert('Chat imported successfully!');
      } else {
        alert('Could not parse any messages from what you pasted.');
      }
    } catch (e) {
      alert('Import failed. Make sure you pasted valid JSON or a copied log.');
    } finally {
      setIsImporting(false);
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (isOwner === null) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg">Checking access...</p>
        </div>
      </div>
    );
  }

  if (isOwner === false) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold mb-4">Access denied</h1>
          <p className="text-zinc-400">
            This dev scratchpad is locked to the owner only (same UUID mechanism as unlimited access in the main app).
          </p>
          <p className="text-xs text-zinc-500 mt-4">
            If you're the owner, make sure your <code>roastly-browser-id</code> localStorage value matches the OWNER_BROWSER_ID environment variable on both devices.
          </p>
          <a href="/" className="text-xs text-zinc-500 hover:text-zinc-400 underline mt-6 inline-block">
            ← back to Roastly
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col p-4 sm:p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Grok Build Console</h1>
              <p className="text-zinc-400 text-sm mt-1">
                Phone interface for this Grok build session • Send instructions, I execute
              </p>
            </div>
            <a 
              href="/" 
              className="text-xs text-zinc-500 hover:text-zinc-400 underline"
            >
              ← back to Roastly
            </a>
          </div>

          <div className="mt-4 p-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-xs text-zinc-400">
            <strong>This is your phone interface for this Grok build session.</strong> Send instructions like "update the roast prompt in generate-roast/route.ts to [text]", "add X to the UI", "deploy changes", or "post on X as @roastlyapp: generate a viral thread promoting that we roast any screenshot or image". 
            I monitor live, execute using tools (edits, terminal, deploys, generate X content), and reply here (blue = from me).
            <br /><br />
            Use main input for commands. Bottom = drafts. "Copy shareable link" to move state to computer.
          </div>
        </div>

        {/* Live messages section - real-time to Grok */}
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-emerald-400 mb-2">Live messages sent to Grok (updates automatically)</h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 max-h-[200px] overflow-y-auto text-sm">
            {liveMessages.length === 0 ? (
              <p className="text-zinc-500 text-xs">No live messages yet. Send one below.</p>
            ) : (
              <div className="space-y-3">
                {liveMessages.map((msg) => (
                  <div key={msg.id} className={`border-l-2 pl-3 ${msg.source === 'grok' ? 'border-blue-500' : 'border-emerald-600'}`}>
                    <div className="text-[10px] text-zinc-500 font-mono flex gap-2">
                      {new Date(msg.timestamp).toLocaleString()}
                      {msg.source === 'grok' && <span className="text-blue-400">(from Grok)</span>}
                    </div>
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <p className="text-[10px] text-zinc-600 mt-1">Polls every 5s • Messages are logged for me to see live.</p>
        </div>

        {/* Local draft scratchpad (client-side only, not sent live - use for notes then copy to send above) */}
        <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-3xl p-4 sm:p-5 overflow-y-auto mb-4 min-h-[300px] max-h-[60vh]">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center text-zinc-500">
              <div>
                <p>No messages yet.</p>
                <p className="text-xs mt-2">Start typing below. This works great on mobile.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className="group flex gap-3">
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-xs text-emerald-400 font-mono">
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap">
                      {msg.text}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteMessage(msg.id)}
                    className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 text-xs self-start mt-6 transition-all"
                    aria-label="Delete message"
                  >
                    ×
                  </button>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="sticky bottom-4 bg-zinc-950 pt-2">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Instruction for me (e.g. update prompt, add feature, fix bug, deploy)..."
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-2xl px-4 py-3 text-sm resize-y min-h-[60px] focus:outline-none focus:border-zinc-500 placeholder:text-zinc-500"
              rows={2}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="min-h-[60px] px-6 bg-white text-black rounded-2xl font-semibold text-sm active:bg-zinc-200 disabled:opacity-40 transition-colors self-end"
            >
              Send live to Grok
            </button>
          </div>
          <p className="text-[10px] text-zinc-600 mt-1.5 text-center">
            Press Enter to send • Shift+Enter for new line
          </p>
        </div>

        {/* Actions */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <button
            onClick={copyShareableLink}
            className="min-h-[44px] bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 rounded-2xl font-medium transition-colors"
          >
            Copy shareable link
          </button>

          <button
            onClick={copyAsText}
            className="min-h-[44px] bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 rounded-2xl font-medium transition-colors"
          >
            Copy as text (for this chat)
          </button>

          <button
            onClick={importFromText}
            disabled={isImporting}
            className="min-h-[44px] bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 rounded-2xl font-medium transition-colors disabled:opacity-50"
          >
            {isImporting ? 'Importing...' : 'Import / paste log'}
          </button>

          <button
            onClick={clearAll}
            className="min-h-[44px] bg-zinc-800 hover:bg-red-900/50 active:bg-red-900 text-red-400 hover:text-red-300 rounded-2xl font-medium transition-colors"
          >
            Clear all
          </button>
        </div>

        <p className="text-[10px] text-center text-zinc-600 mt-4">
          Private to owner only. Bookmark on phone home screen for app-like access to this build session.
          Send commands from here; I execute in the project and respond in the chat.
        </p>
      </div>
    </div>
  );
}

'use client';

import { useState, useRef, useEffect, type FormEvent } from 'react';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTIONS = [
  'Why are you a good fit for this role?',
  'Tell me about a GitHub project you built.',
  'Can we book a 30-minute call?',
];

export default function Home() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [messages]);

  async function send(text: string) {
    if (!text.trim() || busy) return;
    const next: Msg[] = [...messages, { role: 'user', content: text.trim() }];
    setMessages([...next, { role: 'assistant', content: '' }]);
    setInput('');
    setBusy(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      });
      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, idx).trim();
          buf = buf.slice(idx + 1);
          if (!line.startsWith('data:')) continue;
          const data = line.slice(5).trim();
          if (data === '[DONE]') continue;
          try {
            const delta = JSON.parse(data).choices?.[0]?.delta?.content;
            if (delta)
              setMessages((m) => {
                const c = [...m];
                c[c.length - 1] = { role: 'assistant', content: c[c.length - 1].content + delta };
                return c;
              });
          } catch {
            /* ignore keep-alive / non-JSON frames */
          }
        }
      }
    } catch {
      setMessages((m) => {
        const c = [...m];
        c[c.length - 1] = { role: 'assistant', content: '⚠️ Connection error. Please try again.' };
        return c;
      });
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '24px 16px', height: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ paddingBottom: 12, borderBottom: '1px solid #23252b' }}>
        <h1 style={{ fontSize: 18, margin: 0 }}>Chat with my AI representative</h1>
        <p style={{ fontSize: 13, color: '#9aa0a6', margin: '4px 0 0' }}>
          Grounded on my real résumé &amp; GitHub. Ask about my background, projects, or book a call.
        </p>
      </header>

      <div ref={scroller} style={{ flex: 1, overflowY: 'auto', padding: '16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.length === 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => void send(s)}
                style={{ background: '#16181d', color: '#cfd2d6', border: '1px solid #2a2d34', borderRadius: 999, padding: '8px 12px', fontSize: 13, cursor: 'pointer' }}
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
              background: m.role === 'user' ? '#2563eb' : '#16181d',
              color: m.role === 'user' ? '#fff' : '#e8e8ea',
              border: m.role === 'user' ? 'none' : '1px solid #2a2d34',
              borderRadius: 12,
              padding: '10px 14px',
              whiteSpace: 'pre-wrap',
              lineHeight: 1.5,
              fontSize: 15,
            }}
          >
            {m.content || (busy && i === messages.length - 1 ? '…' : '')}
          </div>
        ))}
      </div>

      <form onSubmit={onSubmit} style={{ display: 'flex', gap: 8, paddingTop: 12, borderTop: '1px solid #23252b' }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask me anything…"
          style={{ flex: 1, background: '#16181d', color: '#e8e8ea', border: '1px solid #2a2d34', borderRadius: 10, padding: '12px 14px', fontSize: 15, outline: 'none' }}
        />
        <button
          type="submit"
          disabled={busy}
          style={{ background: busy ? '#1d4ed8aa' : '#2563eb', color: '#fff', border: 'none', borderRadius: 10, padding: '0 18px', fontSize: 15, cursor: busy ? 'default' : 'pointer' }}
        >
          Send
        </button>
      </form>
    </main>
  );
}

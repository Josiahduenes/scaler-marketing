'use client';

import { FormEvent, useMemo, useState } from 'react';
import { Bot, SendHorizontal, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';

const agents = [
  'studio-outreach-review-agent',
  'marketResearchAgent',
  'prospectScoringAgent',
  'outreachDraftAgent',
  'scalerOutreachReviewAgent',
];

const quickPrompts = [
  'What was my last run?',
  'Show leads needing review.',
  'Revise draft 1 to be more direct.',
  'Compare accepted and rejected leads from my latest run.',
];

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type EventItem = {
  type: string;
  label: string;
};

export function AgentConsole() {
  const [agentId, setAgentId] = useState(agents[0]);
  const [threadId] = useState(() => {
    if (typeof window === 'undefined') return '';
    const key = 'scaler-agent-thread-id';
    const existing = window.localStorage.getItem(key);
    if (existing) return existing;
    const created = window.crypto.randomUUID();
    window.localStorage.setItem(key, created);
    return created;
  });
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [busy, setBusy] = useState(false);

  async function submit(prompt = input) {
    const message = prompt.trim();
    if (!message || busy) return;

    setInput('');
    setBusy(true);
    setMessages(prev => [...prev, { role: 'user', content: message }, { role: 'assistant', content: '' }]);

    try {
      const response = await fetch(`/api/mastra/agents/${agentId}/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, threadId }),
      });
      if (!response.body) throw new Error('No response stream returned.');
      await consumeStream(response.body);
    } catch (error) {
      appendAssistant(`\n${error instanceof Error ? error.message : 'Agent request failed.'}`);
    } finally {
      setBusy(false);
    }
  }

  async function consumeStream(body: ReadableStream<Uint8Array>) {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        handleStreamLine(line);
      }
    }
    if (buffer) handleStreamLine(buffer);
  }

  function handleStreamLine(line: string) {
    const cleaned = line.replace(/^data:\s*/, '').trim();
    if (!cleaned || cleaned === '[DONE]') return;

    try {
      const parsed = JSON.parse(cleaned);
      const type = parsed.type || parsed.event || 'event';
      if (type.includes('text') || parsed.payload?.text || parsed.text) {
        appendAssistant(parsed.payload?.text || parsed.text || parsed.delta || '');
      } else {
        setEvents(prev => [
          { type, label: parsed.payload?.toolName || parsed.payload?.stepName || parsed.error || type },
          ...prev,
        ].slice(0, 24));
      }
    } catch {
      appendAssistant(cleaned);
    }
  }

  function appendAssistant(text: string) {
    setMessages(prev => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (last?.role === 'assistant') last.content += text;
      return next;
    });
  }

  const assistantEmpty = useMemo(() => messages.length === 0, [messages.length]);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="flex min-h-[74vh] flex-col rounded-md border border-line bg-white shadow-panel">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-steel" />
            <div>
              <div className="text-xs font-black uppercase text-muted">Agent console</div>
              <div className="font-black">Streaming chat</div>
            </div>
          </div>
          <select value={agentId} onChange={event => setAgentId(event.target.value)} className="rounded-md border border-line bg-field px-3 py-2 text-sm font-bold">
            {agents.map(agent => (
              <option key={agent} value={agent}>
                {agent}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 space-y-4 overflow-auto p-5">
          {assistantEmpty && (
            <div className="grid gap-2 md:grid-cols-2">
              {quickPrompts.map(prompt => (
                <button key={prompt} onClick={() => submit(prompt)} className="rounded-md border border-line bg-field p-4 text-left text-sm font-semibold hover:border-steel">
                  {prompt}
                </button>
              ))}
            </div>
          )}
          {messages.map((message, index) => (
            <div key={index} className={cn('max-w-3xl rounded-md border p-4 text-sm leading-6', message.role === 'user' ? 'ml-auto border-steel/30 bg-steel/10' : 'border-line bg-field')}>
              <div className="mb-1 text-xs font-black uppercase text-muted">{message.role}</div>
              <div className="whitespace-pre-wrap">{message.content || (message.role === 'assistant' && busy ? 'Working...' : '')}</div>
            </div>
          ))}
        </div>
        <form
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            submit();
          }}
          className="flex gap-2 border-t border-line bg-field p-4"
        >
          <input value={input} onChange={event => setInput(event.target.value)} className="min-w-0 flex-1 rounded-md border border-line bg-white px-3 py-2 outline-none focus:border-steel" placeholder="Ask an agent about runs, review packets, or draft revisions." />
          <button disabled={busy} className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 font-black text-paper disabled:opacity-50">
            <SendHorizontal className="h-4 w-4" />
            Send
          </button>
        </form>
      </section>
      <aside className="rounded-md border border-line bg-white shadow-panel">
        <div className="border-b border-line p-4">
          <div className="flex items-center gap-2 font-black">
            <Wrench className="h-4 w-4 text-copper" />
            Stream events
          </div>
        </div>
        <div className="space-y-2 p-4">
          {events.map((event, index) => (
            <div key={`${event.type}-${index}`} className="rounded-md border border-line bg-field p-3">
              <div className="text-xs font-black uppercase text-muted">{event.type}</div>
              <div className="mt-1 text-sm">{event.label}</div>
            </div>
          ))}
          {events.length === 0 && <div className="text-sm text-muted">Tool calls, step events, and errors appear here as the stream runs.</div>}
        </div>
      </aside>
    </div>
  );
}

'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { Play, SlidersHorizontal } from 'lucide-react';

const defaultLocations = ['Houston', 'Dallas', 'Charlotte', 'Cleveland', 'Fort Worth'];
const expectedSteps = [
  'create-workflow-run',
  'discover-candidate-companies',
  'dedupe-candidates',
  'research-companies',
  'score-fit',
  'identify-likely-buyer',
  'draft-outreach',
  'persist-results',
  'return-review-packet',
];

export function WorkflowRunForm() {
  const [targetCount, setTargetCount] = useState(10);
  const [locations, setLocations] = useState(defaultLocations.join(', '));
  const [maxSearchResults, setMaxSearchResults] = useState(50);
  const [minimumFitScore, setMinimumFitScore] = useState(75);
  const [events, setEvents] = useState<string[]>([]);
  const [resultRunId, setResultRunId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setEvents([]);
    setResultRunId(null);

    try {
      const response = await fetch('/api/mastra/workflows/industrial-lead-research-workflow/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetCount,
          locations: locations.split(',').map(item => item.trim()).filter(Boolean),
          maxSearchResults,
          minimumFitScore,
        }),
      });
      if (!response.body) throw new Error('No workflow stream returned.');
      await readStream(response.body);
    } catch (error) {
      setEvents(prev => [`error: ${error instanceof Error ? error.message : 'Workflow failed'}`, ...prev]);
    } finally {
      setBusy(false);
    }
  }

  async function readStream(body: ReadableStream<Uint8Array>) {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) handleLine(line);
    }
    if (buffer) handleLine(buffer);
  }

  function handleLine(line: string) {
    const cleaned = line.replace(/^data:\s*/, '').trim();
    if (!cleaned || cleaned === '[DONE]') return;
    try {
      const parsed = JSON.parse(cleaned);
      const step = parsed.payload?.stepName || parsed.payload?.id || parsed.type || 'workflow-event';
      if (parsed.result?.workflowRunId || parsed.payload?.workflowRunId) setResultRunId(String(parsed.result?.workflowRunId || parsed.payload.workflowRunId));
      setEvents(prev => [`${step}: ${parsed.payload?.status || parsed.status || 'received'}`, ...prev].slice(0, 40));
    } catch {
      setEvents(prev => [cleaned, ...prev].slice(0, 40));
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[420px_minmax(0,1fr)]">
      <form onSubmit={submit} className="rounded-md border border-line bg-white p-5 shadow-panel">
        <div className="mb-5 flex items-center gap-2">
          <SlidersHorizontal className="h-5 w-5 text-copper" />
          <div>
            <div className="text-xs font-black uppercase text-muted">Industrial lead workflow</div>
            <div className="font-black">Run configuration</div>
          </div>
        </div>
        <Field label="Target count">
          <input type="number" min={1} max={50} value={targetCount} onChange={event => setTargetCount(Number(event.target.value))} className="w-full rounded-md border border-line px-3 py-2" />
        </Field>
        <Field label="Locations">
          <textarea value={locations} onChange={event => setLocations(event.target.value)} className="min-h-24 w-full rounded-md border border-line px-3 py-2" />
        </Field>
        <Field label="Max search results">
          <input type="number" min={1} max={200} value={maxSearchResults} onChange={event => setMaxSearchResults(Number(event.target.value))} className="w-full rounded-md border border-line px-3 py-2" />
        </Field>
        <Field label={`Minimum fit score: ${minimumFitScore}`}>
          <input type="range" min={0} max={100} value={minimumFitScore} onChange={event => setMinimumFitScore(Number(event.target.value))} className="w-full accent-steel" />
        </Field>
        <button disabled={busy} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-ink px-4 py-3 font-black text-paper disabled:opacity-50">
          <Play className="h-4 w-4" />
          {busy ? 'Running workflow' : 'Start research run'}
        </button>
      </form>
      <section className="rounded-md border border-line bg-white shadow-panel">
        <div className="border-b border-line p-4">
          <div className="text-xs font-black uppercase text-muted">Progress</div>
          <div className="font-black">Workflow stream</div>
        </div>
        <div className="grid gap-4 p-5 md:grid-cols-2">
          <div>
            <div className="mb-2 text-sm font-black">Expected steps</div>
            <div className="space-y-2">
              {expectedSteps.map(step => (
                <div key={step} className="rounded-md border border-line bg-field px-3 py-2 text-sm font-semibold">
                  {step}
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-2 text-sm font-black">Live events</div>
            <div className="max-h-[520px] space-y-2 overflow-auto">
              {events.map((event, index) => (
                <div key={`${event}-${index}`} className="rounded-md border border-line bg-field px-3 py-2 text-sm">
                  {event}
                </div>
              ))}
              {events.length === 0 && <div className="text-sm text-muted">Workflow events will appear after the run starts.</div>}
            </div>
            {resultRunId && (
              <Link href={`/runs/${resultRunId}`} className="mt-4 inline-flex rounded-md bg-steel px-3 py-2 text-sm font-black text-white">
                Open run #{resultRunId}
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mb-4 block">
      <span className="mb-2 block text-sm font-black">{label}</span>
      {children}
    </label>
  );
}

'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, FileText, MessageSquareText } from 'lucide-react';
import { ScoreGauge } from '@/components/score-gauge';
import { StatusBadge } from '@/components/status-badge';
import { asArray } from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';
import type { FitScore, OutreachDraft, ResearchReport, RunDetail } from '@/lib/schemas/outreach';
import { cn } from '@/lib/utils';

type ReviewInput = {
  status: 'needs-review' | 'approved' | 'rejected' | 'needs-revision';
  reviewerNote?: string;
  revisionInstruction?: string;
};

export function LeadReviewWorkspace({ detail }: { detail: RunDetail }) {
  const queryClient = useQueryClient();
  const [selectedDraftId, setSelectedDraftId] = useState(detail.outreachDrafts[0]?.id);
  const [note, setNote] = useState('');

  const selected = useMemo(() => {
    const draft = detail.outreachDrafts.find(item => item.id === selectedDraftId) || detail.outreachDrafts[0];
    if (!draft) return null;
    return {
      draft,
      fitScore: detail.fitScores.find(score => score.company_id === draft.company_id),
      research: detail.researchReports.find(report => report.company_id === draft.company_id),
    };
  }, [detail, selectedDraftId]);

  const updateDraft = useMutation({
    mutationFn: async ({ draftId, input }: { draftId: number; input: ReviewInput }) => {
      const response = await fetch(`/api/outreach/drafts/${draftId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.runDetail(String(detail.run.id)) });
      setNote('');
    },
  });

  return (
    <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_380px]">
      <section className="rounded-md border border-line bg-white shadow-panel">
        <div className="border-b border-line px-4 py-3">
          <div className="text-xs font-black uppercase text-muted">Lead queue</div>
          <div className="font-black">{detail.outreachDrafts.length} accepted drafts</div>
        </div>
        <div className="max-h-[72vh] overflow-auto p-2">
          {detail.outreachDrafts.map(draft => {
            const score = detail.fitScores.find(item => item.company_id === draft.company_id);
            return (
              <button
                key={draft.id}
                type="button"
                onClick={() => setSelectedDraftId(draft.id)}
                className={cn(
                  'mb-2 w-full rounded-md border p-3 text-left transition hover:border-steel hover:bg-field',
                  selected?.draft.id === draft.id ? 'border-steel bg-field' : 'border-line bg-white',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-black">Draft #{draft.id}</div>
                  <StatusBadge value={draft.status} />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-muted">
                  <span>Company #{draft.company_id}</span>
                  <span>{score?.tier || 'N/A'} / {score?.score ?? 0}</span>
                </div>
              </button>
            );
          })}
          {detail.outreachDrafts.length === 0 && <div className="p-4 text-sm text-muted">No accepted drafts for this run.</div>}
        </div>
      </section>

      <section className="rounded-md border border-line bg-white shadow-panel">
        <div className="border-b border-line px-5 py-4">
          <div className="text-xs font-black uppercase text-copper">Company dossier</div>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-black">Company #{selected?.draft.company_id || 'N/A'}</h2>
            {selected?.fitScore && <StatusBadge value={selected.fitScore.tier} />}
          </div>
        </div>
        {selected ? (
          <Dossier fitScore={selected.fitScore} research={selected.research} />
        ) : (
          <div className="p-6 text-sm text-muted">Select a lead to inspect its research and score.</div>
        )}
      </section>

      <section className="rounded-md border border-line bg-white shadow-panel">
        <div className="border-b border-line px-5 py-4">
          <div className="text-xs font-black uppercase text-copper">Draft review</div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="font-black">Draft #{selected?.draft.id || 'N/A'}</div>
            {selected?.draft.status && <StatusBadge value={selected.draft.status} />}
          </div>
        </div>
        {selected ? (
          <DraftPanel
            draft={selected.draft}
            note={note}
            setNote={setNote}
            busy={updateDraft.isPending}
            onUpdate={status =>
              updateDraft.mutate({
                draftId: selected.draft.id,
                input: {
                  status,
                  reviewerNote: note || undefined,
                  revisionInstruction: status === 'needs-revision' ? note || undefined : undefined,
                },
              })
            }
          />
        ) : (
          <div className="p-6 text-sm text-muted">No draft selected.</div>
        )}
      </section>
    </div>
  );
}

function Dossier({ fitScore, research }: { fitScore?: FitScore; research?: ResearchReport }) {
  const reasons = asArray<string>(fitScore?.reasons_json);
  const disqualifiers = asArray<string>(fitScore?.disqualifiers_json);
  const missing = asArray<string>(fitScore?.missing_data_json);
  const urls = asArray<string>(research?.source_urls_json);

  return (
    <div className="space-y-5 p-5">
      <ScoreGauge score={fitScore?.score} tier={fitScore?.tier} />
      <div>
        <div className="mb-2 flex items-center gap-2 text-sm font-black">
          <FileText className="h-4 w-4 text-steel" />
          Research summary
        </div>
        <p className="rounded-md border border-line bg-field p-4 text-sm leading-6 text-ink">
          {research?.summary || 'No research summary was returned for this company.'}
        </p>
      </div>
      <InfoList title="Score reasons" items={reasons} />
      <InfoList title="Missing data" items={missing} />
      <InfoList title="Disqualifiers" items={disqualifiers} danger />
      <div>
        <div className="mb-2 text-sm font-black">Sources</div>
        <div className="flex flex-wrap gap-2">
          {urls.map(url => (
            <a
              key={url}
              className="inline-flex items-center gap-1 rounded-md border border-line bg-white px-2 py-1 text-xs font-semibold text-steel"
              href={url}
              target="_blank"
              rel="noreferrer"
            >
              Source <ExternalLink className="h-3 w-3" />
            </a>
          ))}
          {urls.length === 0 && <span className="text-sm text-muted">No source URLs stored.</span>}
        </div>
      </div>
    </div>
  );
}

function DraftPanel({
  draft,
  note,
  setNote,
  busy,
  onUpdate,
}: {
  draft: OutreachDraft;
  note: string;
  setNote: (value: string) => void;
  busy: boolean;
  onUpdate: (status: ReviewInput['status']) => void;
}) {
  const subjects = asArray<string>(draft.subject_lines_json);
  const teardown = asArray<string>(draft.teardown_bullets_json);
  const risks = asArray<string>(draft.risk_notes_json);

  return (
    <div className="flex h-[72vh] flex-col">
      <div className="flex-1 space-y-4 overflow-auto p-5">
        <InfoList title="Subject lines" items={subjects} />
        <div>
          <div className="mb-2 text-sm font-black">Body</div>
          <pre className="whitespace-pre-wrap rounded-md border border-line bg-field p-4 text-sm leading-6">{draft.body || 'No body stored.'}</pre>
        </div>
        <InfoList title="Teardown bullets" items={teardown} />
        <InfoList title="Risk notes" items={risks} danger />
        <label className="block">
          <span className="mb-2 flex items-center gap-2 text-sm font-black">
            <MessageSquareText className="h-4 w-4 text-steel" />
            Reviewer note or revision instruction
          </span>
          <textarea
            value={note}
            onChange={event => setNote(event.target.value)}
            className="min-h-28 w-full rounded-md border border-line bg-white p-3 text-sm outline-none focus:border-steel"
            placeholder="Add approval notes or revision guidance."
          />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2 border-t border-line bg-field p-4">
        <button disabled={busy} onClick={() => onUpdate('approved')} className="rounded-md bg-moss px-3 py-2 text-sm font-black text-white disabled:opacity-50">
          Approve
        </button>
        <button disabled={busy} onClick={() => onUpdate('needs-revision')} className="rounded-md bg-warning px-3 py-2 text-sm font-black text-white disabled:opacity-50">
          Needs revision
        </button>
        <button disabled={busy} onClick={() => onUpdate('rejected')} className="rounded-md bg-danger px-3 py-2 text-sm font-black text-white disabled:opacity-50">
          Reject
        </button>
        <button disabled={busy} onClick={() => onUpdate('needs-review')} className="rounded-md border border-line bg-white px-3 py-2 text-sm font-black disabled:opacity-50">
          Reset review
        </button>
      </div>
    </div>
  );
}

function InfoList({ title, items, danger }: { title: string; items: string[]; danger?: boolean }) {
  return (
    <div>
      <div className="mb-2 text-sm font-black">{title}</div>
      {items.length > 0 ? (
        <ul className="space-y-2">
          {items.map((item, index) => (
            <li key={`${item}-${index}`} className={cn('rounded-md border bg-field px-3 py-2 text-sm', danger ? 'border-danger/25' : 'border-line')}>
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-md border border-line bg-field px-3 py-2 text-sm text-muted">No entries stored.</div>
      )}
    </div>
  );
}

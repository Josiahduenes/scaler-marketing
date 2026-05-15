'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { StatusBadge } from '@/components/status-badge';
import { formatDateTime } from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';
import type { OutreachDraft } from '@/lib/schemas/outreach';

const lanes = ['needs-review', 'needs-revision', 'approved', 'rejected'] as const;

async function getDrafts(): Promise<OutreachDraft[]> {
  const response = await fetch('/api/outreach/drafts?limit=80', { cache: 'no-store' });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export default function ReviewPage() {
  const drafts = useQuery({ queryKey: queryKeys.drafts(), queryFn: getDrafts });

  return (
    <AppShell title="Review Queue" eyebrow="Human approval">
      <div className="grid gap-4 xl:grid-cols-4">
        {lanes.map(lane => (
          <section key={lane} className="min-h-[70vh] rounded-md border border-line bg-white shadow-panel">
            <div className="flex items-center justify-between border-b border-line p-4">
              <StatusBadge value={lane} />
              <span className="text-sm font-black">{(drafts.data || []).filter(draft => draft.status === lane).length}</span>
            </div>
            <div className="space-y-3 p-3">
              {(drafts.data || [])
                .filter(draft => draft.status === lane)
                .map(draft => (
                  <Link key={draft.id} href={`/runs/${draft.workflow_run_id}`} className="block rounded-md border border-line bg-field p-4 hover:border-steel">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-black">Draft #{draft.id}</div>
                      <span className="text-xs text-muted">Run #{draft.workflow_run_id}</span>
                    </div>
                    <p className="mt-3 line-clamp-4 text-sm leading-6 text-muted">{draft.body || 'No body stored.'}</p>
                    <div className="mt-3 text-xs font-semibold text-muted">{formatDateTime(draft.created_at)}</div>
                  </Link>
                ))}
            </div>
          </section>
        ))}
      </div>
    </AppShell>
  );
}

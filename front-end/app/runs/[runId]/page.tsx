'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { AppShell } from '@/components/app-shell';
import { LeadReviewWorkspace } from '@/components/lead-review-workspace';
import { queryKeys } from '@/lib/query-keys';
import type { RunDetail } from '@/lib/schemas/outreach';

async function getRunDetail(runId: string): Promise<RunDetail> {
  const response = await fetch(`/api/outreach/runs/${runId}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export default function RunDetailPage() {
  const params = useParams<{ runId: string }>();
  const runId = params.runId;
  const detail = useQuery({ queryKey: queryKeys.runDetail(runId), queryFn: () => getRunDetail(runId) });

  return (
    <AppShell title={`Run #${runId}`} eyebrow="Review workspace">
      {detail.data ? (
        <LeadReviewWorkspace detail={detail.data} />
      ) : detail.isLoading ? (
        <div className="rounded-md border border-line bg-white p-6 shadow-panel">Loading run detail...</div>
      ) : (
        <div className="rounded-md border border-danger/30 bg-danger/10 p-6 text-danger">Unable to load this run.</div>
      )}
    </AppShell>
  );
}

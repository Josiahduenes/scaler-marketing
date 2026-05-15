'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useQueries, useQuery } from '@tanstack/react-query';
import { AppShell } from '@/components/app-shell';
import { RunTable } from '@/components/run-table';
import { StatusBadge } from '@/components/status-badge';
import { queryKeys } from '@/lib/query-keys';
import type { RunDetail, WorkflowRun } from '@/lib/schemas/outreach';

const BarChartPanel = dynamic(() => import('@/components/bar-chart-panel').then(mod => mod.BarChartPanel), {
  ssr: false,
  loading: () => <div className="h-full rounded-md border border-line bg-field" />,
});

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export default function DashboardPage() {
  const runs = useQuery({ queryKey: queryKeys.runs(20), queryFn: () => getJson<WorkflowRun[]>('/api/outreach/runs?limit=20') });
  const detailQueries = useQueries({
    queries: (runs.data || []).slice(0, 8).map(run => ({
      queryKey: queryKeys.runDetail(String(run.id)),
      queryFn: () => getJson<RunDetail>(`/api/outreach/runs/${run.id}`),
      enabled: Boolean(runs.data),
    })),
  });
  const details = detailQueries.map(query => query.data).filter(Boolean) as RunDetail[];
  const allDrafts = details.flatMap(detail => detail.outreachDrafts);
  const allScores = details.flatMap(detail => detail.fitScores);
  const needsReview = allDrafts.filter(draft => draft.status === 'needs-review' || draft.status === 'needs-revision').length;
  const accepted = (runs.data || []).reduce((sum, run) => sum + (run.accepted_count || 0), 0);
  const rejected = (runs.data || []).reduce((sum, run) => sum + (run.rejected_count || 0), 0);
  const tiers = ['A', 'B', 'C', 'Reject'].map(tier => ({
    tier,
    count: allScores.filter(score => score.tier === tier).length,
  }));

  return (
    <AppShell title="Command Center" eyebrow="Private dashboard">
      <div className="grid gap-4 md:grid-cols-4">
        <Kpi label="Runs" value={runs.data?.length || 0} />
        <Kpi label="Accepted leads" value={accepted} />
        <Kpi label="Rejected leads" value={rejected} />
        <Kpi label="Needs review" value={needsReview} tone="warning" />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="rounded-md border border-line bg-white p-5 shadow-panel">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-black uppercase text-muted">Quality mix</div>
              <h2 className="font-black">Tier distribution</h2>
            </div>
            <Link href="/workflows/new" className="rounded-md bg-ink px-3 py-2 text-sm font-black text-paper">
              Start research run
            </Link>
          </div>
          <div className="h-72">
            <BarChartPanel data={tiers.map(item => ({ label: item.tier, count: item.count }))} />
          </div>
        </section>
        <section className="rounded-md border border-line bg-white p-5 shadow-panel">
          <div className="text-xs font-black uppercase text-muted">Latest run</div>
          {runs.data?.[0] ? (
            <div className="mt-3 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-2xl font-black">#{runs.data[0].id}</div>
                <StatusBadge value={runs.data[0].status} />
              </div>
              <p className="text-sm leading-6 text-muted">{runs.data[0].summary || 'No summary recorded.'}</p>
              <Link href={`/runs/${runs.data[0].id}`} className="inline-flex rounded-md bg-steel px-3 py-2 text-sm font-black text-white">
                Open run
              </Link>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted">No runs returned from Xano.</p>
          )}
        </section>
      </div>
      <div className="mt-5">
        <RunTable runs={runs.data || []} />
      </div>
    </AppShell>
  );
}

function Kpi({ label, value, tone }: { label: string; value: number; tone?: 'warning' }) {
  return (
    <div className="rounded-md border border-line bg-white p-5 shadow-panel">
      <div className="text-xs font-black uppercase text-muted">{label}</div>
      <div className={tone === 'warning' ? 'mt-2 text-3xl font-black text-warning' : 'mt-2 text-3xl font-black'}>{value}</div>
    </div>
  );
}

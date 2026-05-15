'use client';

import { useQueries, useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { AppShell } from '@/components/app-shell';
import { asArray } from '@/lib/format';
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

export default function ScoresPage() {
  const runs = useQuery({ queryKey: queryKeys.runs(30), queryFn: () => getJson<WorkflowRun[]>('/api/outreach/runs?limit=30') });
  const detailQueries = useQueries({
    queries: (runs.data || []).slice(0, 12).map(run => ({
      queryKey: queryKeys.runDetail(String(run.id)),
      queryFn: () => getJson<RunDetail>(`/api/outreach/runs/${run.id}`),
    })),
  });
  const details = detailQueries.map(query => query.data).filter(Boolean) as RunDetail[];
  const scores = details.flatMap(detail => detail.fitScores);
  const drafts = details.flatMap(detail => detail.outreachDrafts);
  const tierData = ['A', 'B', 'C', 'Reject'].map(tier => ({ label: tier, count: scores.filter(score => score.tier === tier).length }));
  const draftData = ['approve', 'revise', 'reject'].map(label => ({
    label,
    count: drafts.filter(draft => (draft.draft_quality_json as any)?.recommendation === label).length,
  }));
  const disqualifierCounts = countStrings(scores.flatMap(score => asArray<string>(score.disqualifiers_json))).slice(0, 8);

  return (
    <AppShell title="Scores" eyebrow="Quality analytics">
      <div className="grid gap-5 xl:grid-cols-3">
        <ChartPanel title="Tier breakdown" data={tierData} />
        <ChartPanel title="Draft recommendations" data={draftData} />
        <ChartPanel title="Top disqualifiers" data={disqualifierCounts} />
      </div>
      <div className="mt-5 rounded-md border border-line bg-white p-5 shadow-panel">
        <div className="text-xs font-black uppercase text-muted">Score distribution</div>
        <div className="mt-2 text-3xl font-black">
          {scores.length ? Math.round(scores.reduce((sum, score) => sum + score.score, 0) / scores.length) : 0}
        </div>
        <div className="text-sm text-muted">average fit score across loaded runs</div>
      </div>
    </AppShell>
  );
}

function ChartPanel({ title, data }: { title: string; data: { label: string; count: number }[] }) {
  return (
    <section className="rounded-md border border-line bg-white p-5 shadow-panel">
      <div className="mb-4 font-black">{title}</div>
      <div className="h-72">
        <BarChartPanel data={data} />
      </div>
    </section>
  );
}

function countStrings(items: string[]) {
  const map = new Map<string, number>();
  for (const item of items) map.set(item, (map.get(item) || 0) + 1);
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

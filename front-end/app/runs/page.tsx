'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppShell } from '@/components/app-shell';
import { RunTable } from '@/components/run-table';
import { queryKeys } from '@/lib/query-keys';
import type { WorkflowRun } from '@/lib/schemas/outreach';

async function getRuns(): Promise<WorkflowRun[]> {
  const response = await fetch('/api/outreach/runs?limit=100', { cache: 'no-store' });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export default function RunsPage() {
  const [status, setStatus] = useState('all');
  const runs = useQuery({ queryKey: queryKeys.runs(100), queryFn: getRuns });
  const filtered = useMemo(() => (runs.data || []).filter(run => (status === 'all' ? true : run.status === status)), [runs.data, status]);

  return (
    <AppShell title="Workflow Runs" eyebrow="Run history">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="text-sm text-muted">Newest workflow runs from Xano.</div>
        <select value={status} onChange={event => setStatus(event.target.value)} className="rounded-md border border-line bg-white px-3 py-2 text-sm font-bold">
          <option value="all">All statuses</option>
          <option value="running">Running</option>
          <option value="needs-review">Needs review</option>
          <option value="complete">Complete</option>
          <option value="failed">Failed</option>
        </select>
      </div>
      <RunTable runs={filtered} />
    </AppShell>
  );
}

'use client';

import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { StatusBadge } from '@/components/status-badge';
import { formatDateTime } from '@/lib/format';
import type { WorkflowRun } from '@/lib/schemas/outreach';

export function RunTable({ runs }: { runs: WorkflowRun[] }) {
  return (
    <div className="overflow-hidden rounded-md border border-line bg-white shadow-panel">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-field text-xs font-black uppercase text-muted">
          <tr>
            <th className="px-4 py-3">Run</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Accepted</th>
            <th className="px-4 py-3">Rejected</th>
            <th className="px-4 py-3">Created</th>
            <th className="px-4 py-3">Summary</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {runs.map(run => (
            <tr key={run.id} className="border-t border-line align-top hover:bg-field/50">
              <td className="px-4 py-3 font-black">#{run.id}</td>
              <td className="px-4 py-3">
                <StatusBadge value={run.status} />
              </td>
              <td className="px-4 py-3 font-semibold">{run.accepted_count || 0}</td>
              <td className="px-4 py-3 font-semibold">{run.rejected_count || 0}</td>
              <td className="px-4 py-3 text-muted">{formatDateTime(run.created_at)}</td>
              <td className="max-w-xl px-4 py-3 text-muted">{run.summary || 'No summary recorded.'}</td>
              <td className="px-4 py-3">
                <Link className="inline-flex items-center gap-1 font-bold text-steel" href={`/runs/${run.id}`}>
                  Open <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {runs.length === 0 && <div className="p-8 text-sm text-muted">No workflow runs are available from Xano.</div>}
    </div>
  );
}

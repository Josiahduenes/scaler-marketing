'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppShell } from '@/components/app-shell';
import { formatDateTime } from '@/lib/format';
import type { EmailOutbox, OutreachDraft, WorkflowRun } from '@/lib/schemas/outreach';

const tabs = ['Workflow Runs', 'Drafts', 'Email Outbox'] as const;

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export default function DataPage() {
  const [tab, setTab] = useState<(typeof tabs)[number]>('Workflow Runs');
  const runs = useQuery({ queryKey: ['data-runs'], queryFn: () => getJson<WorkflowRun[]>('/api/outreach/runs?limit=50') });
  const drafts = useQuery({ queryKey: ['data-drafts'], queryFn: () => getJson<OutreachDraft[]>('/api/outreach/drafts?limit=50') });
  const outbox = useQuery({ queryKey: ['data-outbox'], queryFn: () => getJson<EmailOutbox[]>('/api/outreach/email-outbox?limit=50') });

  return (
    <AppShell title="Data Browser" eyebrow="Stored records">
      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map(item => (
          <button key={item} onClick={() => setTab(item)} className={item === tab ? 'rounded-md bg-ink px-3 py-2 text-sm font-black text-paper' : 'rounded-md border border-line bg-white px-3 py-2 text-sm font-black'}>
            {item}
          </button>
        ))}
      </div>
      <div className="overflow-hidden rounded-md border border-line bg-white shadow-panel">
        {tab === 'Workflow Runs' && <JsonTable rows={runs.data || []} columns={['id', 'status', 'accepted_count', 'rejected_count', 'created_at', 'summary']} />}
        {tab === 'Drafts' && <JsonTable rows={drafts.data || []} columns={['id', 'workflow_run_id', 'company_id', 'status', 'created_at', 'body']} />}
        {tab === 'Email Outbox' && <JsonTable rows={outbox.data || []} columns={['id', 'status', 'send_provider', 'to_email', 'subject', 'created_at']} />}
      </div>
    </AppShell>
  );
}

function JsonTable({ rows, columns }: { rows: Record<string, unknown>[]; columns: string[] }) {
  return (
    <table className="w-full border-collapse text-left text-sm">
      <thead className="bg-field text-xs font-black uppercase text-muted">
        <tr>{columns.map(column => <th key={column} className="px-4 py-3">{column}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={String(row.id || index)} className="border-t border-line align-top">
            {columns.map(column => (
              <td key={column} className="max-w-sm truncate px-4 py-3">
                {column.includes('created') ? formatDateTime(String(row[column] || '')) : String(row[column] ?? '')}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

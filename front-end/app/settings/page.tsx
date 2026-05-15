'use client';

import { useQuery } from '@tanstack/react-query';
import { AppShell } from '@/components/app-shell';
import { queryKeys } from '@/lib/query-keys';
import type { User } from '@/lib/schemas/outreach';

type Health = { ok: boolean; service?: string; urlHost?: string; status?: number; error?: string };

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export default function SettingsPage() {
  const me = useQuery({ queryKey: queryKeys.me, queryFn: () => getJson<User>('/api/auth/me') });
  const xano = useQuery({ queryKey: queryKeys.xanoHealth, queryFn: () => getJson<Health>('/api/outreach/health') });
  const mastra = useQuery({ queryKey: queryKeys.mastraHealth, queryFn: () => getJson<Health>('/api/mastra/health') });

  return (
    <AppShell title="Settings" eyebrow="Read-only configuration">
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Current user">
          <Row label="Name" value={me.data?.name || 'Not recorded'} />
          <Row label="Email" value={me.data?.email || 'Not recorded'} />
          <Row label="Role" value={me.data?.role || 'Not recorded'} />
        </Panel>
        <Panel title="Xano Outreach">
          <Row label="Health" value={xano.data?.ok ? 'Connected' : 'Unavailable'} />
          <Row label="Service" value={xano.data?.service || 'scaler_outreach'} />
        </Panel>
        <Panel title="Mastra Server">
          <Row label="Health" value={mastra.data?.ok ? 'Connected' : 'Unavailable'} />
          <Row label="Host" value={mastra.data?.urlHost || 'Not configured'} />
        </Panel>
      </div>
      <Panel title="Default workflow input" className="mt-5">
        <pre className="overflow-auto rounded-md border border-line bg-field p-4 text-sm">
{JSON.stringify(
  {
    targetCount: 10,
    locations: ['Houston', 'Dallas', 'Charlotte', 'Cleveland', 'Fort Worth'],
    maxSearchResults: 50,
    minimumFitScore: 75,
  },
  null,
  2,
)}
        </pre>
      </Panel>
    </AppShell>
  );
}

function Panel({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-md border border-line bg-white p-5 shadow-panel ${className}`}>
      <div className="mb-4 text-xs font-black uppercase text-muted">{title}</div>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-t border-line py-3 first:border-t-0">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-sm font-black">{value}</span>
    </div>
  );
}

'use client';

import { useQuery } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, Server } from 'lucide-react';
import { Sidebar } from '@/components/sidebar';
import { queryKeys } from '@/lib/query-keys';
import type { User } from '@/lib/schemas/outreach';
import { cn } from '@/lib/utils';

type Health = { ok: boolean; service?: string; urlHost?: string; error?: string };

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export function AppShell({ children, title, eyebrow }: { children: React.ReactNode; title: string; eyebrow?: string }) {
  const me = useQuery({ queryKey: queryKeys.me, queryFn: () => getJson<User>('/api/auth/me') });
  const xano = useQuery({ queryKey: queryKeys.xanoHealth, queryFn: () => getJson<Health>('/api/outreach/health') });
  const mastra = useQuery({ queryKey: queryKeys.mastraHealth, queryFn: () => getJson<Health>('/api/mastra/health') });

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 border-b border-line bg-paper/92 px-7 py-4 backdrop-blur">
          <div className="flex items-center justify-between gap-6">
            <div>
              <div className="text-xs font-black uppercase text-copper">{eyebrow || 'Scaler Marketing'}</div>
              <h1 className="mt-1 text-2xl font-black tracking-normal">{title}</h1>
            </div>
            <div className="flex items-center gap-2">
              <HealthPill label="Xano" health={xano.data} loading={xano.isLoading} />
              <HealthPill label="Mastra" health={mastra.data} loading={mastra.isLoading} />
              <div className="rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold shadow-sm">
                {me.data?.name || me.data?.email || 'Team user'}
              </div>
            </div>
          </div>
        </header>
        <div className="p-7">{children}</div>
      </main>
    </div>
  );
}

function HealthPill({ label, health, loading }: { label: string; health?: Health; loading: boolean }) {
  const ok = Boolean(health?.ok);
  const Icon = ok ? CheckCircle2 : AlertCircle;
  return (
    <div
      className={cn(
        'hidden items-center gap-2 rounded-md border px-3 py-2 text-xs font-bold uppercase shadow-sm md:flex',
        ok ? 'border-moss/30 bg-moss/10 text-moss' : 'border-warning/30 bg-warning/10 text-warning',
      )}
      title={health?.urlHost || health?.service || health?.error}
    >
      {loading ? <Server className="h-3.5 w-3.5 animate-pulse" /> : <Icon className="h-3.5 w-3.5" />}
      {label}
    </div>
  );
}

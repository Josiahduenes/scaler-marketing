'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Activity,
  Bot,
  Database,
  Gauge,
  Home,
  LogOut,
  PlaySquare,
  Settings,
  Table2,
  ClipboardCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Command', icon: Home },
  { href: '/runs', label: 'Runs', icon: Table2 },
  { href: '/review', label: 'Review', icon: ClipboardCheck },
  { href: '/agents', label: 'Agents', icon: Bot },
  { href: '/workflows/new', label: 'Start Run', icon: PlaySquare },
  { href: '/data', label: 'Data', icon: Database },
  { href: '/scores', label: 'Scores', icon: Gauge },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-line bg-ink text-paper">
      <div className="border-b border-white/10 p-5">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md border border-copper/50 bg-copper/20">
            <Activity className="h-5 w-5 text-copper" />
          </div>
          <div>
            <div className="text-sm font-black uppercase">Scaler Ops</div>
            <div className="text-xs text-paper/60">research control</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map(item => {
          const Icon = item.icon;
          const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold text-paper/72 transition hover:bg-white/8 hover:text-paper',
                active && 'bg-paper text-ink hover:bg-paper hover:text-ink',
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <button
        type="button"
        onClick={logout}
        className="m-3 flex items-center gap-3 rounded-md border border-white/10 px-3 py-2.5 text-sm font-semibold text-paper/72 hover:bg-white/8 hover:text-paper"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </button>
    </aside>
  );
}

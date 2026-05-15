'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, LockKeyhole } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) throw new Error('Invalid email or password.');
      const nextPath = new URLSearchParams(window.location.search).get('next') || '/';
      router.push(nextPath);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center p-6">
      <div className="w-full max-w-md rounded-md border border-line bg-white shadow-panel">
        <div className="border-b border-line p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-md bg-ink text-paper">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-black uppercase text-copper">Scaler Marketing</div>
              <h1 className="text-2xl font-black">Operations Login</h1>
            </div>
          </div>
          <p className="text-sm leading-6 text-muted">
            Use your Xano team account to review research, run agents, and manage outreach drafts.
          </p>
        </div>
        <form onSubmit={submit} className="space-y-4 p-6">
          <label className="block">
            <span className="mb-2 block text-sm font-black">Email</span>
            <input value={email} onChange={event => setEmail(event.target.value)} type="email" className="w-full rounded-md border border-line px-3 py-2 outline-none focus:border-steel" required />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-black">Password</span>
            <input value={password} onChange={event => setPassword(event.target.value)} type="password" className="w-full rounded-md border border-line px-3 py-2 outline-none focus:border-steel" required />
          </label>
          {error && <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">{error}</div>}
          <button disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-ink px-4 py-3 font-black text-paper disabled:opacity-50">
            <LockKeyhole className="h-4 w-4" />
            {busy ? 'Signing in' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  );
}

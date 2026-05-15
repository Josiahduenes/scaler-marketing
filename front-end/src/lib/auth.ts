import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { userSchema, type User } from '@/lib/schemas/outreach';

export const allowedRoles = new Set(['admin', 'member']);

export function sessionCookieName() {
  return process.env.SESSION_COOKIE_NAME || 'scaler_dashboard_session';
}

export async function getSessionToken() {
  const store = await cookies();
  return store.get(sessionCookieName())?.value;
}

export async function setSessionToken(token: string) {
  const store = await cookies();
  store.set(sessionCookieName(), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24,
  });
}

export async function clearSessionToken() {
  const store = await cookies();
  store.set(sessionCookieName(), '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

export function unauthorized(message = 'Authentication required') {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = 'Insufficient access') {
  return NextResponse.json({ error: message }, { status: 403 });
}

export async function getCurrentUser(): Promise<User | null> {
  const token = await getSessionToken();
  if (!token) return null;

  const baseUrl = process.env.XANO_AUTH_BASE_URL;
  if (!baseUrl) return null;

  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) return null;
  const parsed = userSchema.safeParse(await response.json());
  if (!parsed.success || !allowedRoles.has(parsed.data.role)) return null;
  return parsed.data;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) return { user: null, response: unauthorized() };
  return { user, response: null };
}

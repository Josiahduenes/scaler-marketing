import { z } from 'zod';

type XanoMethod = 'GET' | 'POST' | 'PUT';

export class XanoError extends Error {
  constructor(
    message: string,
    public status: number,
    public detail?: string,
  ) {
    super(message);
  }
}

export function xanoOutreachBaseUrl() {
  const baseUrl = process.env.XANO_OUTREACH_BASE_URL;
  if (!baseUrl) throw new XanoError('XANO_OUTREACH_BASE_URL is not configured', 500);
  return baseUrl.replace(/\/$/, '');
}

export function xanoAuthBaseUrl() {
  const baseUrl = process.env.XANO_AUTH_BASE_URL;
  if (!baseUrl) throw new XanoError('XANO_AUTH_BASE_URL is not configured', 500);
  return baseUrl.replace(/\/$/, '');
}

export async function xanoRequest<T>(
  path: string,
  schema: z.ZodType<T>,
  options: { method?: XanoMethod; body?: unknown; serviceAuth?: boolean; authToken?: string } = {},
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (options.serviceAuth) {
    if (!process.env.XANO_API_TOKEN) throw new XanoError('XANO_API_TOKEN is not configured', 500);
    headers.Authorization = `Bearer ${process.env.XANO_API_TOKEN}`;
  } else if (options.authToken) {
    headers.Authorization = `Bearer ${options.authToken}`;
  }

  const response = await fetch(`${xanoOutreachBaseUrl()}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: 'no-store',
  });

  const text = await response.text();
  const json = text ? safeJson(text) : null;
  if (!response.ok) {
    throw new XanoError(`Xano request failed: ${path}`, response.status, text);
  }

  return schema.parse(json);
}

export async function xanoAuthRequest<T>(
  path: string,
  schema: z.ZodType<T>,
  options: { method?: XanoMethod; body?: unknown; token?: string } = {},
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  const response = await fetch(`${xanoAuthBaseUrl()}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: 'no-store',
  });

  const text = await response.text();
  const json = text ? safeJson(text) : null;
  if (!response.ok) {
    throw new XanoError(`Xano auth request failed: ${path}`, response.status, text);
  }

  return schema.parse(json);
}

export function xanoErrorResponse(error: unknown) {
  if (error instanceof XanoError) {
    return Response.json({ error: error.message, detail: error.detail }, { status: error.status });
  }
  return Response.json({ error: error instanceof Error ? error.message : 'Unexpected server error' }, { status: 500 });
}

function safeJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

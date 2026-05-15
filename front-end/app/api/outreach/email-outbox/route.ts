import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { emailOutboxSchema } from '@/lib/schemas/outreach';
import { xanoErrorResponse, xanoRequest } from '@/lib/xano';

const emailOutboxListSchema = z.array(emailOutboxSchema);

export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') || 20)));
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  params.set('limit', String(limit));

  try {
    const rows = await xanoRequest(`/email_outbox?${params.toString()}`, emailOutboxListSchema, { serviceAuth: true });
    return Response.json(rows);
  } catch (error) {
    return xanoErrorResponse(error);
  }
}

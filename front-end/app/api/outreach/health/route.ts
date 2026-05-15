import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { xanoRequest, xanoErrorResponse } from '@/lib/xano';

const healthSchema = z.object({
  ok: z.boolean().optional().default(true),
  service: z.string().optional(),
});

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  try {
    const health = await xanoRequest('/health', healthSchema);
    return Response.json({ ...health, ok: health.ok ?? true });
  } catch (error) {
    return xanoErrorResponse(error);
  }
}

import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { workflowRunSchema } from '@/lib/schemas/outreach';
import { xanoRequest, xanoErrorResponse } from '@/lib/xano';

const runsSchema = z.array(workflowRunSchema);

export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const url = new URL(request.url);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') || 20)));

  try {
    const runs = await xanoRequest(`/workflow_runs?limit=${limit}`, runsSchema, { serviceAuth: true });
    return Response.json(runs);
  } catch (error) {
    return xanoErrorResponse(error);
  }
}

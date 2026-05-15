import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { outreachDraftSchema, workflowRunSchema } from '@/lib/schemas/outreach';
import { xanoErrorResponse, xanoRequest } from '@/lib/xano';

const runsSchema = z.array(workflowRunSchema);
const draftsSchema = z.array(outreachDraftSchema);

export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') || 50)));

  try {
    const runs = await xanoRequest(`/workflow_runs?limit=${limit}`, runsSchema, { serviceAuth: true });
    const draftLists = await Promise.all(
      runs.slice(0, 20).map(run =>
        xanoRequest(`/outreach_drafts?workflow_run_id=${run.id}`, draftsSchema, { serviceAuth: true }).catch(() => []),
      ),
    );
    const drafts = draftLists.flat().filter(draft => (!status ? true : draft.status === status));
    return Response.json(drafts.slice(0, limit));
  } catch (error) {
    return xanoErrorResponse(error);
  }
}

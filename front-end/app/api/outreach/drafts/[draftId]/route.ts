import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { outreachDraftSchema, reviewStatusSchema } from '@/lib/schemas/outreach';
import { xanoErrorResponse, xanoRequest } from '@/lib/xano';

const updateDraftInputSchema = z.object({
  status: reviewStatusSchema,
  reviewerNote: z.string().optional(),
  revisionInstruction: z.string().optional(),
});

export async function PUT(request: Request, context: { params: Promise<{ draftId: string }> }) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const user = auth.user;

  const { draftId } = await context.params;

  try {
    const input = updateDraftInputSchema.parse(await request.json());
    const before = await xanoRequest(`/outreach_drafts/${encodeURIComponent(draftId)}`, outreachDraftSchema, { serviceAuth: true });

    const updated = await xanoRequest(`/outreach_drafts/${encodeURIComponent(draftId)}`, outreachDraftSchema, {
      method: 'PUT',
      serviceAuth: true,
      body: {
        status: input.status,
        reviewer_note: input.reviewerNote || null,
        revision_instruction: input.revisionInstruction || null,
        updated_at: new Date().toISOString(),
      },
    });

    await xanoRequest('/review_events', z.unknown(), {
      method: 'POST',
      serviceAuth: true,
      body: {
        outreach_draft_id: Number(draftId),
        workflow_run_id: before.workflow_run_id,
        reviewer_id: String(user.id),
        reviewer_name: user.name || user.email || `User ${user.id}`,
        channel: 'api',
        event_type: toReviewEventType(input.status),
        note: input.reviewerNote || input.revisionInstruction || null,
        metadata_json: {
          source: 'vercel-dashboard',
          status: input.status,
        },
      },
    });

    return Response.json(updated);
  } catch (error) {
    return xanoErrorResponse(error);
  }
}

function toReviewEventType(status: z.infer<typeof reviewStatusSchema>) {
  if (status === 'approved' || status === 'rejected' || status === 'needs-revision') return status;
  return 'note-added';
}

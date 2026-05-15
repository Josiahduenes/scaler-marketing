import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import {
  fitScoreSchema,
  outreachDraftSchema,
  researchReportSchema,
  runDetailSchema,
  workflowRunSchema,
} from '@/lib/schemas/outreach';
import { xanoErrorResponse, xanoRequest } from '@/lib/xano';

const researchReportsSchema = z.array(researchReportSchema);
const fitScoresSchema = z.array(fitScoreSchema);
const outreachDraftsSchema = z.array(outreachDraftSchema);

export async function GET(_request: Request, context: { params: Promise<{ runId: string }> }) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const { runId } = await context.params;

  try {
    const [run, researchReports, fitScores, outreachDrafts] = await Promise.all([
      xanoRequest(`/workflow_runs/${encodeURIComponent(runId)}`, workflowRunSchema, { serviceAuth: true }),
      xanoRequest(`/research_reports?workflow_run_id=${encodeURIComponent(runId)}`, researchReportsSchema, { serviceAuth: true }),
      xanoRequest(`/fit_scores?workflow_run_id=${encodeURIComponent(runId)}`, fitScoresSchema, { serviceAuth: true }),
      xanoRequest(`/outreach_drafts?workflow_run_id=${encodeURIComponent(runId)}`, outreachDraftsSchema, { serviceAuth: true }),
    ]);

    const detail = runDetailSchema.parse({
      run,
      researchReports,
      fitScores,
      outreachDrafts,
      rejectedLeads: Array.isArray(run.rejected_leads_json) ? run.rejected_leads_json : [],
    });

    return Response.json(detail);
  } catch (error) {
    return xanoErrorResponse(error);
  }
}

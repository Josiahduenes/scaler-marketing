import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const xanoActionSchema = z.enum([
  // Companies
  'get-company-by-domain',
  'upsert-company',
  // Prospects
  'upsert-prospect',
  // Workflow runs
  'create-workflow-run',
  'update-workflow-run',
  'list-workflow-runs',
  'get-workflow-run',
  // Research & scoring
  'create-research-report',
  'list-research-reports',
  'create-fit-score',
  'list-fit-scores',
  // Outreach drafts
  'create-outreach-draft',
  'list-outreach-drafts',
  'get-outreach-draft',
  'update-outreach-draft',
  // Review events
  'create-review-event',
  // Email outbox
  'create-email-outbox',
  'list-email-outbox',
  'update-email-outbox',
  // Email events
  'create-email-event',
  'list-email-events',
  // Suppressions
  'upsert-suppression',
  'get-suppression-by-email',
  'get-suppression-by-domain',
]);

const xanoInputSchema = z.object({
  action: xanoActionSchema,
  domain: z.string().optional(),
  email: z.string().optional(),
  workflowRunId: z.string().optional(),
  draftId: z.string().optional(),
  outboxId: z.string().optional(),
  limit: z.number().int().positive().max(100).optional(),
  payload: z.record(z.string(), z.unknown()).default({}),
});

const xanoOutputSchema = z.object({
  configured: z.boolean(),
  skipped: z.boolean(),
  endpoint: z.string().optional(),
  data: z.unknown().optional(),
});

export type XanoAction = z.infer<typeof xanoActionSchema>;

export function isXanoConfigured(): boolean {
  return Boolean(process.env.XANO_BASE_URL && process.env.XANO_API_TOKEN);
}

export function getXanoRequest(
  action: XanoAction,
  input: {
    domain?: string;
    email?: string;
    workflowRunId?: string;
    draftId?: string;
    outboxId?: string;
    limit?: number;
    payload?: Record<string, unknown>;
  },
) {
  switch (action) {
    // ── Companies ─────────────────────────────────────────────────────────
    case 'get-company-by-domain':
      return { method: 'GET', path: `/companies/by-domain?domain=${encodeURIComponent(input.domain || '')}` };
    case 'upsert-company':
      return { method: 'POST', path: '/companies/upsert', body: input.payload || {} };

    // ── Prospects ─────────────────────────────────────────────────────────
    case 'upsert-prospect':
      return { method: 'POST', path: '/prospects/upsert', body: input.payload || {} };

    // ── Workflow Runs ──────────────────────────────────────────────────────
    case 'create-workflow-run':
      return { method: 'POST', path: '/workflow_runs', body: input.payload || {} };
    case 'update-workflow-run':
      // Xano uses PUT (not PATCH) — update-mutually exclusive fields only
      return { method: 'PUT', path: `/workflow_runs/${encodeURIComponent(input.workflowRunId || '')}`, body: input.payload || {} };
    case 'list-workflow-runs':
      return { method: 'GET', path: `/workflow_runs?limit=${encodeURIComponent(String(input.limit || 20))}` };
    case 'get-workflow-run':
      return { method: 'GET', path: `/workflow_runs/${encodeURIComponent(input.workflowRunId || '')}` };

    // ── Research Reports ───────────────────────────────────────────────────
    case 'create-research-report':
      return { method: 'POST', path: '/research_reports', body: input.payload || {} };
    case 'list-research-reports':
      return { method: 'GET', path: `/research_reports?workflow_run_id=${encodeURIComponent(input.workflowRunId || '')}` };

    // ── Fit Scores ────────────────────────────────────────────────────────
    case 'create-fit-score':
      return { method: 'POST', path: '/fit_scores', body: input.payload || {} };
    case 'list-fit-scores':
      return { method: 'GET', path: `/fit_scores?workflow_run_id=${encodeURIComponent(input.workflowRunId || '')}` };

    // ── Outreach Drafts ───────────────────────────────────────────────────
    case 'create-outreach-draft':
      return { method: 'POST', path: '/outreach_drafts', body: input.payload || {} };
    case 'list-outreach-drafts':
      return { method: 'GET', path: `/outreach_drafts?workflow_run_id=${encodeURIComponent(input.workflowRunId || '')}` };
    case 'get-outreach-draft':
      return { method: 'GET', path: `/outreach_drafts/${encodeURIComponent(input.draftId || '')}` };
    case 'update-outreach-draft':
      return { method: 'PUT', path: `/outreach_drafts/${encodeURIComponent(input.draftId || '')}`, body: input.payload || {} };

    // ── Review Events ─────────────────────────────────────────────────────
    case 'create-review-event':
      return { method: 'POST', path: '/review_events', body: input.payload || {} };

    // ── Email Outbox ──────────────────────────────────────────────────────
    case 'create-email-outbox':
      return { method: 'POST', path: '/email_outbox', body: input.payload || {} };
    case 'list-email-outbox': {
      const params = new URLSearchParams();
      if (input.payload?.status) params.set('status', String(input.payload.status));
      if (input.limit) params.set('limit', String(input.limit));
      return { method: 'GET', path: `/email_outbox?${params.toString()}` };
    }
    case 'update-email-outbox':
      return { method: 'PUT', path: `/email_outbox/${encodeURIComponent(input.outboxId || '')}`, body: input.payload || {} };

    // ── Email Events ──────────────────────────────────────────────────────
    case 'create-email-event':
      return { method: 'POST', path: '/email_events', body: input.payload || {} };
    case 'list-email-events':
      return { method: 'GET', path: `/email_events?draft_id=${encodeURIComponent(input.draftId || '')}` };

    // ── Suppressions ──────────────────────────────────────────────────────
    case 'upsert-suppression':
      return { method: 'POST', path: '/suppressions/upsert', body: input.payload || {} };
    case 'get-suppression-by-email':
      return { method: 'GET', path: `/suppressions/by-email?email=${encodeURIComponent(input.email || '')}` };
    case 'get-suppression-by-domain':
      return { method: 'GET', path: `/suppressions/by-domain?domain=${encodeURIComponent(input.domain || '')}` };
  }
}

export async function callXano(
  action: XanoAction,
  input: {
    domain?: string;
    email?: string;
    workflowRunId?: string;
    draftId?: string;
    outboxId?: string;
    limit?: number;
    payload?: Record<string, unknown>;
  },
  fetchImpl: typeof fetch = fetch,
) {
  if (!isXanoConfigured()) {
    return {
      configured: false,
      skipped: true,
    };
  }

  const baseUrl = process.env.XANO_BASE_URL;
  if (!baseUrl) {
    return {
      configured: false,
      skipped: true,
    };
  }

  const request = getXanoRequest(action, input);
  const endpoint = `${baseUrl.replace(/\/$/, '')}/${request.path.replace(/^\//, '')}`;
  const response = await fetchImpl(endpoint, {
    method: request.method,
    headers: {
      Authorization: `Bearer ${process.env.XANO_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: 'body' in request ? JSON.stringify(request.body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`Xano ${action} failed with ${response.status} ${response.statusText}`);
  }

  return {
    configured: true,
    skipped: false,
    endpoint,
    data: await response.json().catch(() => undefined),
  };
}

export const xanoTool = createTool({
  id: 'xano-crm',
  description: 'Read and write Scaler Marketing outreach records in Xano. Skips safely when Xano env vars are missing.',
  inputSchema: xanoInputSchema,
  outputSchema: xanoOutputSchema,
  execute: async inputData =>
    callXano(inputData.action, {
      domain: inputData.domain,
      email: inputData.email,
      workflowRunId: inputData.workflowRunId,
      draftId: inputData.draftId,
      outboxId: inputData.outboxId,
      limit: inputData.limit,
      payload: inputData.payload,
    }),
});

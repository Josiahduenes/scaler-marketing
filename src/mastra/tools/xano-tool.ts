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

const DEFAULT_XANO_MIN_REQUEST_INTERVAL_MS = 2_200;
const DEFAULT_XANO_RATE_LIMIT_RETRY_MS = 22_000;
let xanoThrottleQueue = Promise.resolve();
let nextXanoRequestAt = 0;

export function isXanoConfigured(): boolean {
  return Boolean(process.env.XANO_BASE_URL && process.env.XANO_API_TOKEN);
}

export function getXanoMinRequestIntervalMs(): number {
  return parsePositiveIntEnv(process.env.XANO_MIN_REQUEST_INTERVAL_MS, DEFAULT_XANO_MIN_REQUEST_INTERVAL_MS);
}

function getXanoRateLimitRetryMs(response: Response): number {
  const retryAfter = response.headers.get('retry-after');
  const retryAfterSeconds = retryAfter ? Number(retryAfter) : NaN;
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return retryAfterSeconds * 1000;
  }

  return parsePositiveIntEnv(process.env.XANO_RATE_LIMIT_RETRY_MS, DEFAULT_XANO_RATE_LIMIT_RETRY_MS);
}

function parsePositiveIntEnv(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

async function waitForXanoRateLimit(fetchImpl: typeof fetch): Promise<void> {
  // Tests inject fetch implementations; only throttle live Xano traffic.
  if (fetchImpl !== fetch) return;

  const intervalMs = getXanoMinRequestIntervalMs();
  const previousQueue = xanoThrottleQueue;

  xanoThrottleQueue = previousQueue.then(async () => {
    const now = Date.now();
    const waitMs = Math.max(0, nextXanoRequestAt - now);
    nextXanoRequestAt = Math.max(now, nextXanoRequestAt) + intervalMs;

    if (waitMs > 0) {
      await sleep(waitMs);
    }
  });

  await xanoThrottleQueue;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function withXanoPayloadDefaults(action: XanoAction, payload: Record<string, unknown> = {}) {
  const defaults: Partial<Record<XanoAction, Record<string, unknown>>> = {
    'upsert-company': {
      website_url: null,
      industry: null,
      employee_count_min: null,
      employee_count_max: null,
      revenue_estimate: null,
      city: null,
      state: null,
      country: 'US',
      ownership_type: null,
    },
    'upsert-prospect': {
      name: null,
      role_type: 'unknown',
      linkedin_url: null,
      email: null,
      confidence: 0.5,
      source_url: null,
    },
    'create-workflow-run': {
      input_json: {},
      status: 'running',
      accepted_count: 0,
      rejected_count: 0,
      rejected_leads_json: [],
      summary: null,
      error_message: 'none',
    },
    'update-workflow-run': {
      status: null,
      accepted_count: null,
      rejected_count: null,
      rejected_leads_json: null,
      summary: null,
      error_message: null,
      completed_at: null,
    },
    'create-research-report': {
      evidence_json: {},
      source_urls_json: [],
      confidence: 0.5,
    },
    'create-fit-score': {
      reasons_json: [],
      disqualifiers_json: [],
      missing_data_json: [],
    },
    'create-outreach-draft': {
      prospect_id: null,
      subject_lines_json: [],
      teardown_bullets_json: [],
      personalization_json: [],
      risk_notes_json: [],
      draft_quality_json: {},
      status: 'needs-review',
      reviewer_note: null,
      revision_instruction: null,
    },
    'update-outreach-draft': {
      status: null,
      reviewer_note: null,
      revision_instruction: null,
      updated_at: null,
    },
    'create-review-event': {
      workflow_run_id: null,
      reviewer_id: null,
      reviewer_name: null,
      note: null,
      metadata_json: {},
    },
    'create-email-outbox': {
      prospect_id: null,
      to_email: null,
      to_name: null,
      status: 'drafted',
      send_provider: 'unknown',
      approved_by: null,
      approved_at: null,
      send_requested_at: null,
      sent_at: null,
      failure_reason: null,
      metadata_json: {},
    },
    'update-email-outbox': {
      status: null,
      send_provider: null,
      provider_message_id: null,
      provider_thread_id: null,
      approved_by: null,
      approved_at: null,
      send_requested_at: null,
      sent_at: null,
      failure_reason: null,
      metadata_json: null,
      updated_at: null,
    },
    'create-email-event': {
      provider_event_id: null,
      payload_json: {},
    },
    'upsert-suppression': {
      email: null,
      domain: null,
      source: null,
      notes: null,
    },
  };

  return nullifyUndefinedValues({
    ...(defaults[action] || {}),
    ...payload,
  });
}

function nullifyUndefinedValues(value: unknown): unknown {
  if (value === undefined) return null;
  if (Array.isArray(value)) return value.map(nullifyUndefinedValues);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, nullifyUndefinedValues(item)]),
    );
  }
  return value;
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
      return { method: 'POST', path: '/companies/upsert', body: withXanoPayloadDefaults(action, input.payload) };

    // ── Prospects ─────────────────────────────────────────────────────────
    case 'upsert-prospect':
      return { method: 'POST', path: '/prospects/upsert', body: withXanoPayloadDefaults(action, input.payload) };

    // ── Workflow Runs ──────────────────────────────────────────────────────
    case 'create-workflow-run':
      return { method: 'POST', path: '/workflow_runs', body: withXanoPayloadDefaults(action, input.payload) };
    case 'update-workflow-run':
      // Xano uses PUT (not PATCH) — update-mutually exclusive fields only
      return { method: 'PUT', path: `/workflow_runs/${encodeURIComponent(input.workflowRunId || '')}`, body: withXanoPayloadDefaults(action, input.payload) };
    case 'list-workflow-runs':
      return { method: 'GET', path: `/workflow_runs?limit=${encodeURIComponent(String(input.limit || 20))}` };
    case 'get-workflow-run':
      return { method: 'GET', path: `/workflow_runs/${encodeURIComponent(input.workflowRunId || '')}` };

    // ── Research Reports ───────────────────────────────────────────────────
    case 'create-research-report':
      return { method: 'POST', path: '/research_reports', body: withXanoPayloadDefaults(action, input.payload) };
    case 'list-research-reports':
      return { method: 'GET', path: `/research_reports?workflow_run_id=${encodeURIComponent(input.workflowRunId || '')}` };

    // ── Fit Scores ────────────────────────────────────────────────────────
    case 'create-fit-score':
      return { method: 'POST', path: '/fit_scores', body: withXanoPayloadDefaults(action, input.payload) };
    case 'list-fit-scores':
      return { method: 'GET', path: `/fit_scores?workflow_run_id=${encodeURIComponent(input.workflowRunId || '')}` };

    // ── Outreach Drafts ───────────────────────────────────────────────────
    case 'create-outreach-draft':
      return { method: 'POST', path: '/outreach_drafts', body: withXanoPayloadDefaults(action, input.payload) };
    case 'list-outreach-drafts':
      return { method: 'GET', path: `/outreach_drafts?workflow_run_id=${encodeURIComponent(input.workflowRunId || '')}` };
    case 'get-outreach-draft':
      return { method: 'GET', path: `/outreach_drafts/${encodeURIComponent(input.draftId || '')}` };
    case 'update-outreach-draft':
      return { method: 'PUT', path: `/outreach_drafts/${encodeURIComponent(input.draftId || '')}`, body: withXanoPayloadDefaults(action, input.payload) };

    // ── Review Events ─────────────────────────────────────────────────────
    case 'create-review-event':
      return { method: 'POST', path: '/review_events', body: withXanoPayloadDefaults(action, input.payload) };

    // ── Email Outbox ──────────────────────────────────────────────────────
    case 'create-email-outbox':
      return { method: 'POST', path: '/email_outbox', body: withXanoPayloadDefaults(action, input.payload) };
    case 'list-email-outbox': {
      const params = new URLSearchParams();
      if (input.payload?.status) params.set('status', String(input.payload.status));
      if (input.limit) params.set('limit', String(input.limit));
      return { method: 'GET', path: `/email_outbox?${params.toString()}` };
    }
    case 'update-email-outbox':
      return { method: 'PUT', path: `/email_outbox/${encodeURIComponent(input.outboxId || '')}`, body: withXanoPayloadDefaults(action, input.payload) };

    // ── Email Events ──────────────────────────────────────────────────────
    case 'create-email-event':
      return { method: 'POST', path: '/email_events', body: withXanoPayloadDefaults(action, input.payload) };
    case 'list-email-events':
      return { method: 'GET', path: `/email_events?draft_id=${encodeURIComponent(input.draftId || '')}` };

    // ── Suppressions ──────────────────────────────────────────────────────
    case 'upsert-suppression':
      return { method: 'POST', path: '/suppressions/upsert', body: withXanoPayloadDefaults(action, input.payload) };
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

  for (let attempt = 0; attempt < 2; attempt++) {
    await waitForXanoRateLimit(fetchImpl);

    const response = await fetchImpl(endpoint, {
      method: request.method,
      headers: {
        Authorization: `Bearer ${process.env.XANO_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: 'body' in request ? JSON.stringify(request.body) : undefined,
    });

    if (response.ok) {
      return {
        configured: true,
        skipped: false,
        endpoint,
        data: await response.json().catch(() => undefined),
      };
    }

    const errorBody = await response.text().catch(() => '');
    if (response.status === 429 && attempt === 0) {
      await sleep(getXanoRateLimitRetryMs(response));
      continue;
    }

    const detail = errorBody ? `: ${errorBody}` : '';
    throw new Error(`Xano ${action} failed with ${response.status} ${response.statusText}${detail}`);
  }

  throw new Error(`Xano ${action} failed after retrying rate limit response`);
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

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import {
  draftQualityScoreSchema,
  draftReviewUpdateSchema,
  leadReviewPacketSchema,
  outreachDraftSchema,
  reviewStatusSchema,
  workflowRunSummarySchema,
  type DraftQualityScore,
  type LeadReviewPacket,
  type OutreachDraft,
  type ResearchEvidence,
  type WorkflowRunSummary,
} from '../schemas/outreach';
import { callXano } from './xano-tool';
import { scoreOutreachDraft } from '../utils/outreach-utils';

const listRecentOutreachRunsOutputSchema = z.object({
  configured: z.boolean(),
  runs: z.array(workflowRunSummarySchema),
  message: z.string().optional(),
});

const getOutreachRunReviewPacketOutputSchema = z.object({
  configured: z.boolean(),
  workflowRunId: z.string(),
  acceptedLeads: z.array(leadReviewPacketSchema),
  rejectedLeads: z.array(
    z.object({
      company: z.unknown(),
      reason: z.string(),
    }),
  ),
  message: z.string().optional(),
});

const updateDraftReviewStatusOutputSchema = z.object({
  configured: z.boolean(),
  draftId: z.string(),
  status: reviewStatusSchema,
  updated: z.boolean(),
  message: z.string().optional(),
});

const reviseOutreachDraftOutputSchema = z.object({
  configured: z.boolean(),
  draftId: z.string(),
  revisedDraft: outreachDraftSchema.optional(),
  draftQuality: draftQualityScoreSchema.optional(),
  persisted: z.boolean(),
  message: z.string().optional(),
});

export async function listRecentOutreachRuns(limit = 5): Promise<{
  configured: boolean;
  runs: WorkflowRunSummary[];
  message?: string;
}> {
  const result = await callXano('list-workflow-runs', { limit });

  if (!result.configured) {
    return {
      configured: false,
      runs: [],
      message: 'Xano is not configured, so I cannot retrieve outreach runs yet.',
    };
  }

  return {
    configured: true,
    runs: normalizeArray(result.data).map(toWorkflowRunSummary).filter((run): run is WorkflowRunSummary => Boolean(run)),
  };
}

export async function getOutreachRunReviewPacket(workflowRunId: string) {
  const [runResult, draftsResult, reportsResult, scoresResult] = await Promise.all([
    callXano('get-workflow-run', { workflowRunId }),
    callXano('list-outreach-drafts', { workflowRunId }),
    callXano('list-research-reports', { workflowRunId }),
    callXano('list-fit-scores', { workflowRunId }),
  ]);

  if (!runResult.configured || !draftsResult.configured || !reportsResult.configured || !scoresResult.configured) {
    return {
      configured: false,
      workflowRunId,
      acceptedLeads: [],
      rejectedLeads: [],
      message: 'Xano is not configured, so I cannot retrieve review packets yet.',
    };
  }

  const acceptedLeads = normalizeArray(draftsResult.data)
    .map((draftRecord, index) => toLeadReviewPacket(draftRecord, normalizeArray(reportsResult.data)[index], normalizeArray(scoresResult.data)[index]))
    .filter((packet): packet is LeadReviewPacket => Boolean(packet));

  const rejectedLeads = normalizeArray((runResult.data as { rejected_leads_json?: unknown[]; rejectedLeads?: unknown[] } | undefined)?.rejected_leads_json ?? (runResult.data as { rejectedLeads?: unknown[] } | undefined)?.rejectedLeads).map(item => ({
    company: (item as { company?: unknown }).company,
    reason: String((item as { reason?: unknown }).reason || 'Rejected during research/scoring.'),
  }));

  return {
    configured: true,
    workflowRunId,
    acceptedLeads,
    rejectedLeads,
  };
}

export async function updateDraftReviewStatus(input: z.infer<typeof draftReviewUpdateSchema>) {
  const parsed = draftReviewUpdateSchema.parse(input);
  const existingDraft = await callXano('get-outreach-draft', {
    draftId: parsed.draftId,
  });
  const result = await callXano('update-outreach-draft', {
    draftId: parsed.draftId,
    payload: {
      status: parsed.status,
      reviewer_note: parsed.reviewerNote,
      updated_at: new Date().toISOString(),
    },
  });

  if (!result.configured) {
    return {
      configured: false,
      draftId: parsed.draftId,
      status: parsed.status,
      updated: false,
      message: 'Xano is not configured, so I cannot update draft review state yet.',
    };
  }

  if (existingDraft.configured) {
    await callXano('create-review-event', {
      payload: {
        outreach_draft_id: parsed.draftId,
        workflow_run_id: extractWorkflowRunId(existingDraft.data),
        reviewer_id: 'mastra-studio',
        reviewer_name: 'Mastra Studio',
        channel: 'api',
        event_type: parsed.status === 'needs-review' ? 'note-added' : parsed.status,
        note: parsed.reviewerNote,
        metadata_json: {
          status: parsed.status,
        },
      },
    });
  }

  return {
    configured: true,
    draftId: parsed.draftId,
    status: parsed.status,
    updated: true,
  };
}

export async function reviseOutreachDraft(input: {
  draftId: string;
  revisionInstruction: string;
}): Promise<{
  configured: boolean;
  draftId: string;
  revisedDraft?: OutreachDraft;
  draftQuality?: DraftQualityScore;
  persisted: boolean;
  message?: string;
}> {
  const result = await callXano('update-outreach-draft', {
    draftId: input.draftId,
    payload: {
      revision_instruction: input.revisionInstruction,
      status: 'needs-revision',
      updated_at: new Date().toISOString(),
    },
  });

  if (!result.configured) {
    return {
      configured: false,
      draftId: input.draftId,
      persisted: false,
      message: 'Xano is not configured, so I cannot revise and persist drafts yet.',
    };
  }

  const existingDraft = await callXano('get-outreach-draft', {
    draftId: input.draftId,
  });

  if (existingDraft.configured) {
    await callXano('create-review-event', {
      payload: {
        outreach_draft_id: input.draftId,
        workflow_run_id: extractWorkflowRunId(existingDraft.data),
        reviewer_id: 'mastra-studio',
        reviewer_name: 'Mastra Studio',
        channel: 'api',
        event_type: 'needs-revision',
        note: input.revisionInstruction,
        metadata_json: {
          revisionInstruction: input.revisionInstruction,
        },
      },
    });
  }

  const revisedDraft = toOutreachDraft(result.data, input.revisionInstruction);
  const research = toResearchEvidence(result.data);
  const draftQuality = research ? scoreOutreachDraft(revisedDraft, research) : undefined;

  return {
    configured: true,
    draftId: input.draftId,
    revisedDraft,
    draftQuality,
    persisted: true,
  };
}

export const listRecentOutreachRunsTool = createTool({
  id: 'list-recent-outreach-runs',
  description: 'List recent Scaler outreach workflow runs from Xano.',
  inputSchema: z.object({
    limit: z.number().int().positive().max(20).default(5),
  }),
  outputSchema: listRecentOutreachRunsOutputSchema,
  execute: async inputData => listRecentOutreachRuns(inputData.limit ?? 5),
});

export const getOutreachRunReviewPacketTool = createTool({
  id: 'get-outreach-run-review-packet',
  description: 'Fetch lead review packets, drafts, fit scores, and evidence for an outreach workflow run.',
  inputSchema: z.object({
    workflowRunId: z.string(),
  }),
  outputSchema: getOutreachRunReviewPacketOutputSchema,
  execute: async inputData => getOutreachRunReviewPacket(inputData.workflowRunId),
});

export const updateDraftReviewStatusTool = createTool({
  id: 'update-draft-review-status',
  description: 'Approve, reject, or mark an outreach draft as needing revision in Xano.',
  inputSchema: draftReviewUpdateSchema,
  outputSchema: updateDraftReviewStatusOutputSchema,
  requireApproval: true,
  execute: async inputData => updateDraftReviewStatus(inputData),
});

export const reviseOutreachDraftTool = createTool({
  id: 'revise-outreach-draft',
  description: 'Record a requested revision for an outreach draft and mark it as needing revision.',
  inputSchema: z.object({
    draftId: z.string(),
    revisionInstruction: z.string(),
  }),
  outputSchema: reviseOutreachDraftOutputSchema,
  execute: async inputData => reviseOutreachDraft(inputData),
});

function normalizeArray(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;
    if (Array.isArray(record.items)) return record.items;
    if (Array.isArray(record.data)) return record.data;
    if (Array.isArray(record.records)) return record.records;
  }
  return [];
}

function toWorkflowRunSummary(data: unknown): WorkflowRunSummary | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const record = data as Record<string, unknown>;
  const parsed = workflowRunSummarySchema.safeParse({
    workflowRunId: String(record.workflowRunId || record.workflow_run_id || record.id || ''),
    status: String(record.status || 'unknown'),
    acceptedCount: Number(record.acceptedCount || record.accepted_count || 0),
    rejectedCount: Number(record.rejectedCount || record.rejected_count || 0),
    summary: String(record.summary || ''),
    createdAt: optionalString(record.createdAt || record.created_at),
    completedAt: optionalString(record.completedAt || record.completed_at),
  });
  return parsed.success ? parsed.data : undefined;
}

function toLeadReviewPacket(draftRecord: unknown, reportRecord: unknown, scoreRecord: unknown): LeadReviewPacket | undefined {
  if (!draftRecord || typeof draftRecord !== 'object') return undefined;
  const draft = draftRecord as Record<string, unknown>;
  const report = reportRecord && typeof reportRecord === 'object' ? (reportRecord as Record<string, unknown>) : {};
  const score = scoreRecord && typeof scoreRecord === 'object' ? (scoreRecord as Record<string, unknown>) : {};
  const evidence = report.evidence_json || report.evidence || draft.research;
  const parsedEvidence = toResearchEvidence(evidence);

  if (!parsedEvidence) return undefined;

  const parsedDraft = outreachDraftSchema.safeParse({
    subjectLines: parseJsonArray(draft.subject_lines_json || draft.subjectLines, ['Review draft subject']),
    openingPersonalization: String(draft.opening_personalization || draft.openingPersonalization || ''),
    body: String(draft.body || ''),
    customTeardownBullets: parseJsonArray(draft.teardown_bullets_json || draft.customTeardownBullets, [
      'Review the site for conversion path opportunities.',
      'Review technical proof and case study visibility.',
      'Review CTA clarity for qualified industrial buyers.',
    ]),
    cta: String(draft.cta || 'Worth me sending over a quick teardown of where your site may be leaking qualified industrial buyers?'),
    riskNotes: parseJsonArray(draft.risk_notes || draft.riskNotes, []),
    sourceBackedPersonalizationNotes: parseJsonArray(draft.source_notes || draft.sourceBackedPersonalizationNotes, parsedEvidence.evidenceUrls),
  });

  if (!parsedDraft.success) return undefined;

  const draftQuality = scoreOutreachDraft(parsedDraft.data, parsedEvidence);
  const packet = leadReviewPacketSchema.safeParse({
    company: parsedEvidence.company,
    research: parsedEvidence,
    fitScore: {
      totalScore: Number(score.score || score.totalScore || 0),
      tier: score.tier || 'C',
      reasons: parseJsonArray(score.reasons_json || score.reasons, []),
      disqualifierHits: parseJsonArray(score.disqualifiers_json || score.disqualifierHits, []),
      missingData: parseJsonArray(score.missing_data || score.missingData, []),
    },
    decisionMaker: {
      title: String(draft.prospect_title || draft.title || 'VP of Sales'),
      inferredRole: 'decision-maker',
      confidence: Number(draft.confidence || 0.5),
    },
    draft: parsedDraft.data,
    draftQuality,
    reviewStatus: draft.status || 'needs-review',
    recommendedReviewReason: draftQuality.recommendation === 'approve' ? 'Draft is source-backed and ready for human review.' : draftQuality.issues.join('; '),
  });

  return packet.success ? packet.data : undefined;
}

function toOutreachDraft(data: unknown, revisionInstruction: string): OutreachDraft {
  const record = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  const parsed = outreachDraftSchema.safeParse(record.revisedDraft || record.draft || record);
  if (parsed.success) return parsed.data;

  return {
    subjectLines: ['Revised Scaler teardown idea', 'Pipeline audit idea'],
    openingPersonalization: revisionInstruction,
    body: String(record.body || revisionInstruction),
    customTeardownBullets: [
      'Review the homepage and product pages for buyer-specific conversion paths.',
      'Clarify technical differentiators in ROI-focused language.',
      'Tighten the CTA around a short custom teardown.',
    ],
    cta: 'Worth me sending over a quick teardown of where your site may be leaking qualified industrial buyers?',
    riskNotes: ['Revision was recorded from Slack; review final copy before use.'],
    sourceBackedPersonalizationNotes: [],
  };
}

function toResearchEvidence(data: unknown): ResearchEvidence | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const record = data as Record<string, unknown>;
  const candidate = record.evidence_json || record.evidence || record.research || record;
  const parsed = z
    .object({
      company: z.unknown(),
      websiteObservations: z.array(z.string()).default([]),
      ctaQuality: z.enum(['strong', 'weak', 'missing', 'unknown']).default('unknown'),
      caseStudyPresence: z.enum(['present', 'absent', 'unknown']).default('unknown'),
      tradeShowSignals: z.array(z.string()).default([]),
      linkedInContentSignals: z.array(z.string()).default([]),
      hiringSignals: z.array(z.string()).default([]),
      acquisitionOrRebrandSignals: z.array(z.string()).default([]),
      evidenceUrls: z.array(z.string().url()).default([]),
      confidence: z.number().min(0).max(1).default(0.5),
      summary: z.string().default(''),
    })
    .safeParse(candidate);

  if (!parsed.success) return undefined;

  const companyParse = z
    .object({
      name: z.string(),
      domain: z.string().optional(),
      website: z.string().url(),
      location: z.string().default('Unknown'),
      employeeEstimate: z.number().int().positive().optional(),
      revenueEstimate: z.string().optional(),
      industry: z.string().default('Unknown'),
      ownershipSignal: z.string().optional(),
      sourceUrls: z.array(z.string().url()).default([]),
    })
    .safeParse(parsed.data.company);

  if (!companyParse.success) return undefined;

  return {
    ...parsed.data,
    company: companyParse.data,
  };
}

function parseJsonArray<T>(value: unknown, fallback: T[]): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : fallback;
    } catch {
      return value ? ([value] as T[]) : fallback;
    }
  }
  return fallback;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function extractWorkflowRunId(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const record = data as Record<string, unknown>;
  const workflowRunId = record.workflow_run_id || record.workflowRunId;
  return workflowRunId === undefined || workflowRunId === null ? undefined : String(workflowRunId);
}

import { z } from 'zod';

export const userSchema = z.object({
  id: z.number(),
  name: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  role: z.enum(['admin', 'member']).catch('member'),
});

export const reviewStatusSchema = z.enum(['needs-review', 'approved', 'rejected', 'needs-revision']);

export const workflowRunSchema = z.object({
  id: z.number(),
  created_at: z.string().optional().nullable(),
  completed_at: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  accepted_count: z.number().nullable().optional().default(0),
  rejected_count: z.number().nullable().optional().default(0),
  input_json: z.unknown().optional(),
  rejected_leads_json: z.unknown().optional(),
  summary: z.string().nullable().optional(),
  error_message: z.string().nullable().optional(),
});

export const companySchema = z.object({
  id: z.number().optional(),
  name: z.string().nullable().optional(),
  domain: z.string().nullable().optional(),
  website_url: z.string().nullable().optional(),
  industry: z.string().nullable().optional(),
  employee_count_min: z.number().nullable().optional(),
  employee_count_max: z.number().nullable().optional(),
  revenue_estimate: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  ownership_type: z.string().nullable().optional(),
  last_researched_at: z.string().nullable().optional(),
});

export const prospectSchema = z.object({
  id: z.number().optional(),
  company_id: z.number().nullable().optional(),
  name: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  role_type: z.enum(['buyer', 'champion', 'unknown']).nullable().optional(),
  linkedin_url: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  confidence: z.number().nullable().optional(),
});

export const researchReportSchema = z.object({
  id: z.number(),
  created_at: z.string().optional().nullable(),
  company_id: z.number(),
  workflow_run_id: z.number(),
  evidence_json: z.unknown().optional(),
  source_urls_json: z.unknown().optional(),
  summary: z.string().nullable().optional(),
  confidence: z.number().nullable().optional(),
});

export const fitScoreSchema = z.object({
  id: z.number(),
  created_at: z.string().optional().nullable(),
  company_id: z.number(),
  workflow_run_id: z.number(),
  score: z.number(),
  tier: z.enum(['A', 'B', 'C', 'Reject']).catch('Reject'),
  reasons_json: z.unknown().optional(),
  disqualifiers_json: z.unknown().optional(),
  missing_data_json: z.unknown().optional(),
});

export const outreachDraftSchema = z.object({
  id: z.number(),
  created_at: z.string().optional().nullable(),
  updated_at: z.string().optional().nullable(),
  company_id: z.number(),
  prospect_id: z.number().nullable().optional(),
  workflow_run_id: z.number(),
  subject_lines_json: z.unknown().optional(),
  body: z.string().nullable().optional(),
  teardown_bullets_json: z.unknown().optional(),
  personalization_json: z.unknown().optional(),
  risk_notes_json: z.unknown().optional(),
  draft_quality_json: z.unknown().optional(),
  status: reviewStatusSchema.catch('needs-review'),
  reviewer_note: z.string().nullable().optional(),
  revision_instruction: z.string().nullable().optional(),
});

export const reviewEventSchema = z.object({
  id: z.number(),
  created_at: z.string().optional().nullable(),
  outreach_draft_id: z.number(),
  workflow_run_id: z.number().nullable().optional(),
  reviewer_id: z.string().nullable().optional(),
  reviewer_name: z.string().nullable().optional(),
  channel: z.string().optional(),
  event_type: z.string().optional(),
  note: z.string().nullable().optional(),
  metadata_json: z.unknown().optional(),
});

export const emailOutboxSchema = z.object({
  id: z.number(),
  created_at: z.string().optional().nullable(),
  updated_at: z.string().optional().nullable(),
  outreach_draft_id: z.number(),
  company_id: z.number(),
  prospect_id: z.number().nullable().optional(),
  to_email: z.string().nullable().optional(),
  to_name: z.string().nullable().optional(),
  subject: z.string().nullable().optional(),
  body: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  send_provider: z.string().nullable().optional(),
});

export const runDetailSchema = z.object({
  run: workflowRunSchema,
  researchReports: z.array(researchReportSchema),
  fitScores: z.array(fitScoreSchema),
  outreachDrafts: z.array(outreachDraftSchema),
  rejectedLeads: z.array(z.unknown()),
});

export type User = z.infer<typeof userSchema>;
export type WorkflowRun = z.infer<typeof workflowRunSchema>;
export type Company = z.infer<typeof companySchema>;
export type Prospect = z.infer<typeof prospectSchema>;
export type ResearchReport = z.infer<typeof researchReportSchema>;
export type FitScore = z.infer<typeof fitScoreSchema>;
export type OutreachDraft = z.infer<typeof outreachDraftSchema>;
export type ReviewEvent = z.infer<typeof reviewEventSchema>;
export type EmailOutbox = z.infer<typeof emailOutboxSchema>;
export type RunDetail = z.infer<typeof runDetailSchema>;

export type LeadReviewViewModel = {
  draft: OutreachDraft;
  fitScore?: FitScore;
  researchReport?: ResearchReport;
};

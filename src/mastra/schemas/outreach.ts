import { z } from 'zod';

export const OUTREACH_RESEARCH_MODEL = 'openai/gpt-5.4';
export const OUTREACH_DRAFT_MODEL = 'openai/gpt-5.4';

export const icpConfigSchema = z.object({
  segmentName: z.string(),
  industries: z.array(z.string()).min(1),
  employeeRange: z.object({
    min: z.number().int().nonnegative(),
    max: z.number().int().positive(),
  }),
  geos: z.array(z.string()).min(1),
  buyerTitles: z.array(z.string()).min(1),
  championTitles: z.array(z.string()).min(1),
  qualifyingSignals: z.array(z.string()).min(1),
  disqualifiers: z.array(z.string()).min(1),
  positioningAngle: z.string(),
});

export const prospectCompanySchema = z.object({
  name: z.string(),
  domain: z.string().optional(),
  website: z.string().url(),
  location: z.string().default('Unknown'),
  employeeEstimate: z.number().int().positive().optional(),
  revenueEstimate: z.string().optional(),
  industry: z.string().default('Unknown'),
  ownershipSignal: z.string().optional(),
  sourceUrls: z.array(z.string().url()).default([]),
});

export const researchEvidenceSchema = z.object({
  company: prospectCompanySchema,
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
});

export const fitScoreSchema = z.object({
  totalScore: z.number().min(0).max(100),
  tier: z.enum(['A', 'B', 'C', 'Reject']),
  reasons: z.array(z.string()).default([]),
  disqualifierHits: z.array(z.string()).default([]),
  missingData: z.array(z.string()).default([]),
});

export const decisionMakerSchema = z.object({
  name: z.string().optional(),
  title: z.string(),
  inferredRole: z.enum(['decision-maker', 'champion', 'unknown']),
  linkedInUrl: z.string().url().optional(),
  email: z.string().email().optional(),
  confidence: z.number().min(0).max(1).default(0.5),
});

export const outreachDraftSchema = z.object({
  subjectLines: z.array(z.string()).min(2).max(3),
  openingPersonalization: z.string(),
  body: z.string(),
  customTeardownBullets: z.array(z.string()).min(3).max(5),
  cta: z.string(),
  riskNotes: z.array(z.string()).default([]),
  sourceBackedPersonalizationNotes: z.array(z.string()).default([]),
});

export const draftQualityScoreSchema = z.object({
  score: z.number().min(0).max(100),
  grounded: z.boolean(),
  wordCount: z.number().int().nonnegative(),
  issues: z.array(z.string()).default([]),
  recommendation: z.enum(['approve', 'revise', 'reject']),
});

export const reviewStatusSchema = z.enum(['needs-review', 'approved', 'rejected', 'needs-revision']);

export const workflowRunSummarySchema = z.object({
  workflowRunId: z.string(),
  status: z.string(),
  acceptedCount: z.number().int().nonnegative(),
  rejectedCount: z.number().int().nonnegative(),
  summary: z.string(),
  createdAt: z.string().optional(),
  completedAt: z.string().optional(),
});

export const draftReviewUpdateSchema = z.object({
  draftId: z.string(),
  status: reviewStatusSchema,
  reviewerNote: z.string().optional(),
});

export const leadReviewPacketSchema = z.object({
  company: prospectCompanySchema,
  research: researchEvidenceSchema,
  fitScore: fitScoreSchema,
  decisionMaker: decisionMakerSchema,
  draft: outreachDraftSchema,
  draftQuality: draftQualityScoreSchema,
  reviewStatus: reviewStatusSchema.default('needs-review'),
  recommendedReviewReason: z.string(),
});

export const workflowRunResultSchema = z.object({
  workflowRunId: z.string(),
  acceptedLeads: z.array(leadReviewPacketSchema),
  rejectedLeads: z.array(
    z.object({
      company: prospectCompanySchema,
      fitScore: fitScoreSchema,
      reason: z.string(),
    }),
  ),
  reviewStatus: z.enum(['needs-review', 'complete']).default('needs-review'),
  runSummary: z.string(),
});

export const workflowInputSchema = z.object({
  targetCount: z.number().int().positive().max(50).default(10),
  icpConfig: icpConfigSchema.default({
    segmentName: 'Segment A - Industrial Machinery Manufacturing',
    industries: ['Industrial Machinery Manufacturing'],
    employeeRange: { min: 201, max: 500 },
    geos: ['Houston', 'Dallas', 'Charlotte', 'Cleveland', 'Fort Worth'],
    buyerTitles: ['VP of Sales', 'COO', 'President', 'Owner'],
    championTitles: ['Marketing Coordinator', 'Sales Manager'],
    qualifyingSignals: [
      'outdated or generic website',
      'weak CTA or no conversion path',
      'no case studies or proof of process',
      'trade show-heavy pipeline',
      'hiring sales or marketing roles',
      'active LinkedIn but weak content strategy',
      'recent acquisition or rebrand',
      'estimated revenue above $20M',
    ],
    disqualifiers: [
      'under 50 employees',
      'consumer-facing brand',
      'non-profit or educational institution',
      'international-only presence',
    ],
    positioningAngle:
      'For mid-market industrial manufacturers that have outgrown their referral-only pipeline, Scaler builds the website and marketing system that turns engineering expertise into consistent inbound leads.',
  }),
  locations: z
    .array(z.string())
    .min(1)
    .default(['Houston', 'Dallas', 'Charlotte', 'Cleveland', 'Fort Worth']),
  maxSearchResults: z.number().int().positive().max(200).default(50),
  minimumFitScore: z.number().min(0).max(100).default(75),
});

export const webSearchResultSchema = z.object({
  title: z.string(),
  url: z.string().url(),
  snippet: z.string().default(''),
});

export const webSearchOutputSchema = z.object({
  query: z.string(),
  results: z.array(webSearchResultSchema),
});

export type IcpConfig = z.infer<typeof icpConfigSchema>;
export type ProspectCompany = z.infer<typeof prospectCompanySchema>;
export type ResearchEvidence = z.infer<typeof researchEvidenceSchema>;
export type FitScore = z.infer<typeof fitScoreSchema>;
export type DecisionMaker = z.infer<typeof decisionMakerSchema>;
export type OutreachDraft = z.infer<typeof outreachDraftSchema>;
export type DraftQualityScore = z.infer<typeof draftQualityScoreSchema>;
export type ReviewStatus = z.infer<typeof reviewStatusSchema>;
export type WorkflowRunSummary = z.infer<typeof workflowRunSummarySchema>;
export type DraftReviewUpdate = z.infer<typeof draftReviewUpdateSchema>;
export type LeadReviewPacket = z.infer<typeof leadReviewPacketSchema>;
export type WorkflowRunResult = z.infer<typeof workflowRunResultSchema>;
export type WorkflowInput = z.infer<typeof workflowInputSchema>;
export type WebSearchResult = z.infer<typeof webSearchResultSchema>;

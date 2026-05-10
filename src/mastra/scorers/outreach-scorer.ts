import { z } from 'zod';
import { createScorer } from '@mastra/core/evals';
import {
  getAssistantMessageFromRunOutput,
  getUserMessageFromRunInput,
} from '@mastra/evals/scorers/utils';
import { OUTREACH_RESEARCH_MODEL } from '../schemas/outreach';

export const outreachGroundingScorer = createScorer({
  id: 'outreach-grounding-scorer',
  name: 'Outreach Grounding',
  description: 'Checks that Scaler outreach drafts are grounded, specific, concise, and compliant with V1 constraints.',
  type: 'agent',
  judge: {
    model: OUTREACH_RESEARCH_MODEL,
    instructions:
      'You evaluate B2B cold email drafts. Penalize unsupported claims, fake familiarity, missing source grounding, multiple CTAs, and copy outside 90-140 words. Return only structured JSON.',
  },
})
  .preprocess(({ run }) => ({
    userText: getUserMessageFromRunInput(run.input) || '',
    assistantText: getAssistantMessageFromRunOutput(run.output) || '',
  }))
  .analyze({
    description: 'Evaluate outreach draft quality and grounding',
    outputSchema: z.object({
      grounded: z.boolean(),
      concise: z.boolean(),
      singleCta: z.boolean(),
      riskyClaims: z.array(z.string()).default([]),
      explanation: z.string().default(''),
    }),
    createPrompt: ({ results }) => `
Evaluate the outreach output.

Input:
"""
${results.preprocessStepResult.userText}
"""

Output:
"""
${results.preprocessStepResult.assistantText}
"""

Return JSON with:
{
  "grounded": boolean,
  "concise": boolean,
  "singleCta": boolean,
  "riskyClaims": string[],
  "explanation": string
}
`,
  })
  .generateScore(({ results }) => {
    const r = (results as any)?.analyzeStepResult || {};
    let score = 1;
    if (!r.grounded) score -= 0.35;
    if (!r.concise) score -= 0.2;
    if (!r.singleCta) score -= 0.2;
    if ((r.riskyClaims || []).length > 0) score -= 0.25;
    return Math.max(0, score);
  })
  .generateReason(({ results, score }) => {
    const r = (results as any)?.analyzeStepResult || {};
    return `Outreach grounding score=${score}. grounded=${r.grounded ?? false}, concise=${r.concise ?? false}, singleCta=${r.singleCta ?? false}. ${(r.riskyClaims || []).join('; ')} ${r.explanation ?? ''}`;
  });

export const outreachDiscoveryQualityScorer = createScorer({
  id: 'outreach-discovery-quality-scorer',
  name: 'Outreach Discovery Quality',
  description:
    'Scores whether the industrial outreach workflow discovered real prospect company domains rather than marketplaces, UGC pages, international-only companies, or generic content.',
})
  .preprocess(({ run }) => {
    const output = asRecord(run.output);
    const groundTruth = asRecord(run.groundTruth);
    const rejectedLeads = normalizeArray(output.rejectedLeads);
    const acceptedLeads = normalizeArray(output.acceptedLeads);
    const allLeads = [...acceptedLeads, ...rejectedLeads];
    const badCandidates = allLeads
      .map(lead => {
        const company = asRecord(asRecord(lead).company);
        const reasons = classifyBadCandidate(company);
        return {
          name: stringValue(company.name),
          domain: stringValue(company.domain),
          website: stringValue(company.website),
          reasons,
        };
      })
      .filter(candidate => candidate.reasons.length > 0);

    return {
      acceptedCount: acceptedLeads.length,
      rejectedCount: rejectedLeads.length,
      badCandidates,
      expectedAcceptedLeadCountMin: numberValue(groundTruth.expectedAcceptedLeadCountMin),
      expectedRejectedBadDomainCountMin: numberValue(groundTruth.expectedRejectedBadDomainCountMin),
      primaryFailure: stringValue(groundTruth.primaryFailure),
    };
  })
  .generateScore(({ results }) => {
    const r = (results as any).preprocessStepResult;
    let score = 1;

    if (r.badCandidates.length > 0) score -= Math.min(0.75, r.badCandidates.length * 0.25);
    if (r.expectedAcceptedLeadCountMin !== undefined && r.acceptedCount < r.expectedAcceptedLeadCountMin) {
      score -= 0.2;
    }
    if (
      r.expectedRejectedBadDomainCountMin !== undefined &&
      r.badCandidates.length < r.expectedRejectedBadDomainCountMin
    ) {
      score -= 0.15;
    }

    return clampScore(score);
  })
  .generateReason(({ results, score }) => {
    const r = (results as any).preprocessStepResult;
    const badCandidateSummary = r.badCandidates
      .map((candidate: { domain: string; reasons: string[] }) => `${candidate.domain}: ${candidate.reasons.join(', ')}`)
      .join('; ');

    return `Discovery quality score=${score}. accepted=${r.acceptedCount}, rejected=${r.rejectedCount}, badCandidates=${r.badCandidates.length}. ${badCandidateSummary || 'No obvious bad candidate domains detected.'}`;
  });

export const outreachLeadOutcomeScorer = createScorer({
  id: 'outreach-lead-outcome-scorer',
  name: 'Outreach Lead Outcome',
  description:
    'Compares the workflow lead outcome against human ground truth labels such as accepted lead count, humanAccepted, and failure category.',
})
  .preprocess(({ run }) => {
    const output = asRecord(run.output);
    const groundTruth = asRecord(run.groundTruth);
    const acceptedCount = normalizeArray(output.acceptedLeads).length;
    const rejectedCount = normalizeArray(output.rejectedLeads).length;
    const expectedAcceptedLeadCountMin = numberValue(groundTruth.expectedAcceptedLeadCountMin);
    const expectedAcceptedLeadCountMax = numberValue(groundTruth.expectedAcceptedLeadCountMax);
    const humanAccepted = booleanValue(groundTruth.humanAccepted);
    const primaryFailure = stringValue(groundTruth.primaryFailure);

    return {
      acceptedCount,
      rejectedCount,
      humanAccepted,
      expectedAcceptedLeadCountMin,
      expectedAcceptedLeadCountMax,
      primaryFailure,
      hasGroundTruth: Object.keys(groundTruth).length > 0,
    };
  })
  .generateScore(({ results }) => {
    const r = (results as any).preprocessStepResult;
    let score = 1;

    if (r.humanAccepted === false && r.acceptedCount > 0) score -= 0.45;
    if (r.humanAccepted === true && r.acceptedCount === 0) score -= 0.45;
    if (r.expectedAcceptedLeadCountMin !== undefined && r.acceptedCount < r.expectedAcceptedLeadCountMin) {
      score -= 0.5;
    }
    if (r.expectedAcceptedLeadCountMax !== undefined && r.acceptedCount > r.expectedAcceptedLeadCountMax) {
      score -= 0.2;
    }
    if (!r.hasGroundTruth && r.acceptedCount === 0) score -= 0.25;

    return clampScore(score);
  })
  .generateReason(({ results, score }) => {
    const r = (results as any).preprocessStepResult;
    return `Lead outcome score=${score}. accepted=${r.acceptedCount}, rejected=${r.rejectedCount}, humanAccepted=${r.humanAccepted ?? 'unlabeled'}, expectedAcceptedRange=${r.expectedAcceptedLeadCountMin ?? 'unknown'}-${r.expectedAcceptedLeadCountMax ?? 'unknown'}, primaryFailure=${r.primaryFailure || 'none'}.`;
  });

export const outreachBadCandidateFilterScorer = createScorer({
  id: 'outreach-bad-candidate-filter-scorer',
  name: 'Outreach Bad Candidate Filter',
  description:
    'Checks whether clearly bad domains and page types are rejected with appropriate low scores and disqualifier reasoning.',
})
  .preprocess(({ run }) => {
    const output = asRecord(run.output);
    const rejectedLeads = normalizeArray(output.rejectedLeads);
    const badRejected = rejectedLeads
      .map(lead => {
        const record = asRecord(lead);
        const company = asRecord(record.company);
        const fitScore = asRecord(record.fitScore);
        const reasons = classifyBadCandidate(company);
        return {
          domain: stringValue(company.domain),
          reasons,
          score: numberValue(fitScore.totalScore) ?? 0,
          tier: stringValue(fitScore.tier),
          disqualifierHits: normalizeArray(fitScore.disqualifierHits).map(String),
        };
      })
      .filter(candidate => candidate.reasons.length > 0);

    const overScored = badRejected.filter(candidate => candidate.score > 10 || candidate.tier !== 'Reject');
    const missingDisqualifiers = badRejected.filter(candidate => candidate.disqualifierHits.length === 0);

    return {
      badRejected,
      overScored,
      missingDisqualifiers,
    };
  })
  .generateScore(({ results }) => {
    const r = (results as any).preprocessStepResult;
    if (r.badRejected.length === 0) return 1;

    let score = 1;
    score -= Math.min(0.6, r.overScored.length * 0.25);
    score -= Math.min(0.4, r.missingDisqualifiers.length * 0.15);
    return clampScore(score);
  })
  .generateReason(({ results, score }) => {
    const r = (results as any).preprocessStepResult;
    const overScored = r.overScored
      .map((candidate: { domain: string; score: number; tier: string }) => `${candidate.domain} scored ${candidate.score}/${candidate.tier}`)
      .join('; ');
    const missing = r.missingDisqualifiers
      .map((candidate: { domain: string }) => candidate.domain)
      .join(', ');

    return `Bad candidate filter score=${score}. badRejected=${r.badRejected.length}, overScored=${r.overScored.length}, missingDisqualifiers=${r.missingDisqualifiers.length}. ${overScored ? `Over-scored: ${overScored}.` : ''} ${missing ? `Missing disqualifiers: ${missing}.` : ''}`;
  });

export const outreachScorers = {
  outreachGroundingScorer,
  outreachDiscoveryQualityScorer,
  outreachLeadOutcomeScorer,
  outreachBadCandidateFilterScorer,
};

function classifyBadCandidate(company: Record<string, unknown>): string[] {
  const domain = stringValue(company.domain).toLowerCase();
  const website = stringValue(company.website).toLowerCase();
  const name = stringValue(company.name).toLowerCase();
  const industry = stringValue(company.industry).toLowerCase();
  const reasons: string[] = [];

  if (/(^|\.)quora\.com$|(^|\.)reddit\.com$|(^|\.)medium\.com$|(^|\.)wikipedia\.org$/.test(domain)) {
    reasons.push('ugc-content');
  }
  if (/(^|\.)machinehub\.com$|(^|\.)machinio\.com$|(^|\.)ebay\.com$|(^|\.)amazon\.com$/.test(domain)) {
    reasons.push('marketplace-listing');
  }
  if (domain.endsWith('.co.za') || domain.endsWith('.co.uk') || domain.endsWith('.com.au')) {
    reasons.push('international-only');
  }
  if (/freight|import|export|logistics|shipping|forwarding/.test(`${name} ${industry}`)) {
    reasons.push('wrong-company');
  }
  if (/\/listings?\//.test(website) || /^what |^how |best examples|for sale/.test(name)) {
    reasons.push('not-company-homepage');
  }

  return [...new Set(reasons)];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function normalizeArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function booleanValue(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(1, Number(value.toFixed(4))));
}

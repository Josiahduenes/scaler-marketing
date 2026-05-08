import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import {
  draftQualityScoreSchema,
  fitScoreSchema,
  leadReviewPacketSchema,
  prospectCompanySchema,
  researchEvidenceSchema,
  workflowInputSchema,
  workflowRunResultSchema,
  type LeadReviewPacket,
  type ProspectCompany,
  type ResearchEvidence,
} from '../schemas/outreach';
import { dedupeDomains, rememberProcessedDomain } from '../tools/dedupe-tool';
import { fetchPageText } from '../tools/page-fetch-tool';
import { callXano } from '../tools/xano-tool';
import { runWebSearch } from '../tools/web-search-tool';
import {
  buildResearchEvidence,
  draftOutreach,
  extractCompaniesFromSearchResults,
  inferDecisionMaker,
  normalizeDomain,
  scoreCompanyFit,
  scoreOutreachDraft,
  uniqueByDomain,
} from '../utils/outreach-utils';

const workflowStateSchema = z.object({
  workflowRunId: z.string(),
  input: workflowInputSchema,
  candidates: z.array(prospectCompanySchema).default([]),
  duplicateDomains: z.array(z.string()).default([]),
  researched: z.array(researchEvidenceSchema).default([]),
  acceptedLeads: z.array(leadReviewPacketSchema).default([]),
  rejectedLeads: z
    .array(
      z.object({
        company: prospectCompanySchema,
        fitScore: fitScoreSchema,
        reason: z.string(),
      }),
    )
    .default([]),
});

type WorkflowState = z.infer<typeof workflowStateSchema>;

const createWorkflowRun = createStep({
  id: 'create-workflow-run',
  description: 'Create an auditable run record in Xano when configured, otherwise use the Mastra run id.',
  inputSchema: workflowInputSchema,
  outputSchema: workflowStateSchema,
  execute: async ({ inputData, runId }) => {
    const parsedInput = workflowInputSchema.parse(inputData);
    const xanoRun = await callXano('create-workflow-run', {
      payload: {
        input_json: parsedInput,
        status: 'running',
        accepted_count: 0,
        rejected_count: 0,
        summary: 'Industrial lead research run started.',
      },
    });
    const xanoId = extractXanoId(xanoRun.data);

    return {
      workflowRunId: xanoId || runId,
      input: parsedInput,
      candidates: [],
      duplicateDomains: [],
      researched: [],
      acceptedLeads: [],
      rejectedLeads: [],
    };
  },
});

const discoverCandidateCompanies = createStep({
  id: 'discover-candidate-companies',
  description: 'Search by ICP location and industrial manufacturing signals to produce candidate companies.',
  inputSchema: workflowStateSchema,
  outputSchema: workflowStateSchema,
  execute: async ({ inputData }) => {
    const { input } = inputData;
    const perQueryLimit = Math.max(5, Math.ceil(input.maxSearchResults / input.locations.length));
    const results = [];

    for (const location of input.locations) {
      const query = `"industrial machinery manufacturer" "${location}" "request a quote"`;
      results.push(...(await runWebSearch(query, perQueryLimit)));
    }

    const candidates = extractCompaniesFromSearchResults(results, input.maxSearchResults);
    return {
      ...inputData,
      candidates,
    };
  },
});

const dedupeCandidates = createStep({
  id: 'dedupe-candidates',
  description: 'Normalize domains and remove candidates already seen in Xano or local memory.',
  inputSchema: workflowStateSchema,
  outputSchema: workflowStateSchema,
  execute: async ({ inputData }) => {
    const uniqueCandidates = uniqueByDomain(inputData.candidates);
    const dedupeResult = await dedupeDomains(uniqueCandidates.map(company => company.domain || company.website));
    const fresh = new Set(dedupeResult.freshDomains);

    return {
      ...inputData,
      candidates: uniqueCandidates.filter(company => fresh.has(normalizeDomain(company.domain || company.website))),
      duplicateDomains: dedupeResult.duplicateDomains,
    };
  },
});

const researchCompanies = createStep({
  id: 'research-companies',
  description: 'Fetch candidate websites and extract source-backed research evidence.',
  inputSchema: workflowStateSchema,
  outputSchema: workflowStateSchema,
  execute: async ({ inputData }) => {
    const researched: ResearchEvidence[] = [];
    const desiredResearchCount = Math.min(inputData.candidates.length, inputData.input.targetCount * 3);

    for (const company of inputData.candidates.slice(0, desiredResearchCount)) {
      let pageText = '';
      try {
        pageText = (await fetchPageText(company.website)).text;
      } catch (error) {
        pageText = `Unable to fetch website text: ${error instanceof Error ? error.message : 'unknown error'}`;
      }

      researched.push(buildResearchEvidence(company, pageText));
    }

    return {
      ...inputData,
      researched,
    };
  },
});

const scoreFit = createStep({
  id: 'score-fit',
  description: 'Score researched companies against the Segment A ICP.',
  inputSchema: workflowStateSchema,
  outputSchema: workflowStateSchema,
  execute: async ({ inputData }) => {
    const accepted: LeadReviewPacket[] = [];
    const rejected: WorkflowState['rejectedLeads'] = [];

    for (const research of inputData.researched) {
      const fitScore = scoreCompanyFit(research, inputData.input.icpConfig);
      if (fitScore.totalScore < inputData.input.minimumFitScore || fitScore.tier === 'Reject') {
        rejected.push({
          company: research.company,
          fitScore,
          reason: fitScore.disqualifierHits[0] || `Fit score ${fitScore.totalScore} is below threshold ${inputData.input.minimumFitScore}.`,
        });
        continue;
      }

      const decisionMaker = inferDecisionMaker(research.company, inputData.input.icpConfig);
      const draft = draftOutreach(research.company, research, decisionMaker);
      const draftQuality = scoreOutreachDraft(draft, research);
      accepted.push({
        company: research.company,
        research,
        fitScore,
        decisionMaker,
        draft,
        draftQuality,
        reviewStatus: 'needs-review',
        recommendedReviewReason:
          draftQuality.recommendation === 'approve'
            ? 'Draft is source-backed and ready for human review.'
            : `Draft needs review: ${draftQuality.issues.join('; ')}`,
      });

      if (accepted.length >= inputData.input.targetCount) break;
    }

    return {
      ...inputData,
      acceptedLeads: accepted,
      rejectedLeads: rejected,
    };
  },
});

const scoreDraft = createStep({
  id: 'score-draft',
  description: 'Ensure draft quality metadata is current before persistence.',
  inputSchema: workflowStateSchema,
  outputSchema: workflowStateSchema,
  execute: async ({ inputData }) => ({
    ...inputData,
    acceptedLeads: inputData.acceptedLeads.map(packet => {
      const draftQuality = draftQualityScoreSchema.parse(scoreOutreachDraft(packet.draft, packet.research));
      return {
        ...packet,
        draftQuality,
        recommendedReviewReason:
          draftQuality.recommendation === 'approve'
            ? 'Draft is source-backed and ready for human review.'
            : `Draft needs review: ${draftQuality.issues.join('; ')}`,
      };
    }),
  }),
});

const identifyLikelyBuyer = createStep({
  id: 'identify-likely-buyer',
  description: 'Infer the best buyer role without fabricating personal contact details.',
  inputSchema: workflowStateSchema,
  outputSchema: workflowStateSchema,
  execute: async ({ inputData }) => ({
    ...inputData,
    acceptedLeads: inputData.acceptedLeads.map(packet => ({
      ...packet,
      decisionMaker: inferDecisionMaker(packet.company, inputData.input.icpConfig),
    })),
  }),
});

const draftOutreachStep = createStep({
  id: 'draft-outreach',
  description: 'Draft source-backed cold email and custom teardown bullets for each accepted lead.',
  inputSchema: workflowStateSchema,
  outputSchema: workflowStateSchema,
  execute: async ({ inputData }) => ({
    ...inputData,
    acceptedLeads: inputData.acceptedLeads.map(packet => {
      const draft = draftOutreach(packet.company, packet.research, packet.decisionMaker);
      const draftQuality = scoreOutreachDraft(draft, packet.research);
      return {
        ...packet,
        draft,
        draftQuality,
        recommendedReviewReason:
          draftQuality.recommendation === 'approve'
            ? 'Draft is source-backed and ready for human review.'
            : `Draft needs review: ${draftQuality.issues.join('; ')}`,
      };
    }),
  }),
});

const persistResults = createStep({
  id: 'persist-results',
  description: 'Persist accepted and rejected lead artifacts to Xano when configured and remember processed domains locally.',
  inputSchema: workflowStateSchema,
  outputSchema: workflowStateSchema,
  execute: async ({ inputData }) => {
    for (const packet of inputData.acceptedLeads) {
      const companyDomain = normalizeDomain(packet.company.domain || packet.company.website);
      rememberProcessedDomain(companyDomain);

      const companyResult = await callXano('upsert-company', {
        payload: toXanoCompany(packet.company),
      });
      const companyId = extractXanoId(companyResult.data);

      const prospectResult = await callXano('upsert-prospect', {
        payload: {
          company_id: companyId,
          name: packet.decisionMaker.name,
          title: packet.decisionMaker.title,
          role_type: packet.decisionMaker.inferredRole,
          linkedin_url: packet.decisionMaker.linkedInUrl,
          email: packet.decisionMaker.email,
          confidence: packet.decisionMaker.confidence,
        },
      });
      const prospectId = extractXanoId(prospectResult.data);

      await callXano('create-research-report', {
        payload: {
          company_id: companyId,
          workflow_run_id: inputData.workflowRunId,
          evidence_json: packet.research,
          source_urls_json: packet.research.evidenceUrls,
          summary: packet.research.summary,
        },
      });
      await callXano('create-fit-score', {
        payload: {
          company_id: companyId,
          workflow_run_id: inputData.workflowRunId,
          score: packet.fitScore.totalScore,
          tier: packet.fitScore.tier,
          reasons_json: packet.fitScore.reasons,
          disqualifiers_json: packet.fitScore.disqualifierHits,
        },
      });
      await callXano('create-outreach-draft', {
        payload: {
          company_id: companyId,
          prospect_id: prospectId,
          workflow_run_id: inputData.workflowRunId,
          subject_lines_json: packet.draft.subjectLines,
          body: packet.draft.body,
          teardown_bullets_json: packet.draft.customTeardownBullets,
          status: packet.reviewStatus,
        },
      });
    }

    await callXano('update-workflow-run', {
      workflowRunId: inputData.workflowRunId,
      payload: {
        status: 'needs-review',
        accepted_count: inputData.acceptedLeads.length,
        rejected_count: inputData.rejectedLeads.length,
        rejected_leads_json: inputData.rejectedLeads,
        summary: buildRunSummary(inputData),
        completed_at: new Date().toISOString(),
      },
    });

    return inputData;
  },
});

const returnReviewPacket = createStep({
  id: 'return-review-packet',
  description: 'Return source-backed lead packets for human review in Mastra Studio.',
  inputSchema: workflowStateSchema,
  outputSchema: workflowRunResultSchema,
  execute: async ({ inputData }) => ({
    workflowRunId: inputData.workflowRunId,
    acceptedLeads: inputData.acceptedLeads,
    rejectedLeads: inputData.rejectedLeads,
    reviewStatus: 'needs-review' as const,
    runSummary: buildRunSummary(inputData),
  }),
});

export const industrialLeadResearchWorkflow = createWorkflow({
  id: 'industrial-lead-research-workflow',
  inputSchema: workflowInputSchema,
  outputSchema: workflowRunResultSchema,
})
  .then(createWorkflowRun)
  .then(discoverCandidateCompanies)
  .then(dedupeCandidates)
  .then(researchCompanies)
  .then(scoreFit)
  .then(identifyLikelyBuyer)
  .then(draftOutreachStep)
  .then(scoreDraft)
  .then(persistResults)
  .then(returnReviewPacket)
  .commit();

function toXanoCompany(company: ProspectCompany) {
  const domain = normalizeDomain(company.domain || company.website);
  return {
    name: company.name,
    domain,
    website_url: company.website,
    industry: company.industry,
    employee_count_min: company.employeeEstimate,
    employee_count_max: company.employeeEstimate,
    revenue_estimate: company.revenueEstimate,
    city: company.location,
    state: undefined,
    country: 'United States',
    ownership_type: company.ownershipSignal,
  };
}

function extractXanoId(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const record = data as Record<string, unknown>;
  const nested = record.data && typeof record.data === 'object' ? (record.data as Record<string, unknown>) : undefined;
  const id = record.id || nested?.id;
  return id === undefined ? undefined : String(id);
}

function buildRunSummary(state: WorkflowState): string {
  return `Prepared ${state.acceptedLeads.length} lead review packet(s), rejected ${state.rejectedLeads.length} candidate(s), skipped ${state.duplicateDomains.length} duplicate domain(s).`;
}

import { describe, expect, test } from 'bun:test';
import {
  outreachBadCandidateFilterScorer,
  outreachDiscoveryQualityScorer,
  outreachLeadOutcomeScorer,
} from '../scorers/outreach-scorer';

const badDiscoveryOutput = {
  workflowRunId: '2',
  acceptedLeads: [],
  rejectedLeads: [
    {
      company: {
        name: "Johannesburg's Most Trusted Import & Export Partner in South Africa",
        domain: 'flexagonfreight.co.za',
        website: 'https://flexagonfreight.co.za',
        location: 'Houston',
        industry: 'Unknown',
        sourceUrls: ['https://www.flexagonfreight.co.za/import-export/'],
      },
      fitScore: {
        totalScore: 48,
        tier: 'Reject',
        reasons: ['Company is in a priority geography.'],
        disqualifierHits: [],
        missingData: ['industrial category confidence', 'employee estimate'],
      },
      reason: 'Fit score 48 is below threshold 75.',
    },
    {
      company: {
        name: 'Used CWP Centering Reels for Sale',
        domain: 'machinehub.com',
        website: 'https://machinehub.com',
        location: 'Dallas',
        industry: 'Industrial Machinery Manufacturing',
        sourceUrls: ['https://machinehub.com/listings/1665-cwp-pull-off-coil-reel-uncoiler-2-500-lbs'],
      },
      fitScore: {
        totalScore: 58,
        tier: 'C',
        reasons: ['Matches industrial manufacturing category.'],
        disqualifierHits: [],
        missingData: ['employee estimate'],
      },
      reason: 'Fit score 58 is below threshold 75.',
    },
    {
      company: {
        name: 'What are the best examples for B2B ecommerce?',
        domain: 'quora.com',
        website: 'https://quora.com',
        location: 'Unknown',
        industry: 'Industrial Machinery Manufacturing',
        sourceUrls: ['https://www.quora.com/What-are-the-best-examples-for-B2B-ecommerce'],
      },
      fitScore: {
        totalScore: 58,
        tier: 'C',
        reasons: ['Matches industrial manufacturing category.'],
        disqualifierHits: [],
        missingData: ['employee estimate', 'priority geography match'],
      },
      reason: 'Fit score 58 is below threshold 75.',
    },
  ],
  reviewStatus: 'needs-review',
  runSummary: 'Prepared 0 lead review packet(s), rejected 3 candidate(s), skipped 0 duplicate domain(s).',
};

const badDiscoveryGroundTruth = {
  humanAccepted: false,
  expectedAcceptedLeadCountMin: 5,
  expectedAcceptedLeadCountMax: 10,
  expectedRejectedBadDomainCountMin: 3,
  discoveryQuality: 'bad',
  researchQuality: 'bad',
  draftQuality: 'reject',
  primaryFailure: 'bad-discovery',
  researchIssues: ['wrong-company', 'international-only', 'marketplace-listing', 'ugc-content', 'thin-sourcing'],
  scoringIssues: ['missed-disqualifier', 'score-too-high'],
  draftIssues: [],
  reviewNotes: 'The workflow found non-prospect pages instead of U.S. industrial machinery manufacturer homepages.',
};

describe('outreach workflow scorers', () => {
  test('penalizes bad discovery domains and page types', async () => {
    const result = await outreachDiscoveryQualityScorer.run({
      input: {},
      output: badDiscoveryOutput,
      groundTruth: badDiscoveryGroundTruth,
    });

    expect(result.score).toBeLessThanOrEqual(0.1);
    expect(result.reason).toContain('badCandidates=3');
    expect(result.reason).toContain('quora.com');
    expect(result.reason).toContain('machinehub.com');
  });

  test('penalizes zero accepted leads when ground truth expected accepted leads', async () => {
    const result = await outreachLeadOutcomeScorer.run({
      input: {},
      output: badDiscoveryOutput,
      groundTruth: badDiscoveryGroundTruth,
    });

    expect(result.score).toBeLessThanOrEqual(0.5);
    expect(result.reason).toContain('accepted=0');
  });

  test('flags bad candidates that were over-scored or lack disqualifiers', async () => {
    const result = await outreachBadCandidateFilterScorer.run({
      input: {},
      output: badDiscoveryOutput,
      groundTruth: badDiscoveryGroundTruth,
    });

    expect(result.score).toBeLessThan(0.5);
    expect(result.reason).toContain('overScored=3');
    expect(result.reason).toContain('missingDisqualifiers=3');
  });
});

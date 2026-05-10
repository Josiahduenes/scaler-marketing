import { describe, expect, test } from 'bun:test';
import { outreachDraftSchema, workflowInputSchema } from '../schemas/outreach';
import {
  buildResearchEvidence,
  draftOutreach,
  extractCompaniesFromSearchResults,
  getCandidateDisqualifiers,
  inferDecisionMaker,
  normalizeDomain,
  scoreCompanyFit,
  scoreOutreachDraft,
  uniqueByDomain,
} from '../utils/outreach-utils';

describe('outreach utilities', () => {
  test('normalizes and dedupes domains', () => {
    expect(normalizeDomain('https://www.Example.com/path')).toBe('example.com');
    expect(
      uniqueByDomain([
        { name: 'A', website: 'https://www.example.com', domain: 'www.example.com', location: 'Houston', industry: 'Industrial Machinery Manufacturing', sourceUrls: [] },
        { name: 'B', website: 'https://example.com', domain: 'example.com', location: 'Houston', industry: 'Industrial Machinery Manufacturing', sourceUrls: [] },
      ]),
    ).toHaveLength(1);
  });

  test('scores a strong industrial manufacturer as accepted', () => {
    const input = workflowInputSchema.parse({});
    const company = {
      name: 'Acme Industrial Equipment',
      website: 'https://acmeindustrial.com',
      domain: 'acmeindustrial.com',
      location: 'Houston, Texas',
      employeeEstimate: 300,
      industry: 'Industrial Machinery Manufacturing',
      sourceUrls: ['https://acmeindustrial.com'],
    };
    const evidence = buildResearchEvidence(
      company,
      'Industrial machinery equipment request a quote trade show careers sales manager no case studies',
    );

    const score = scoreCompanyFit(evidence, input.icpConfig);
    expect(score.totalScore).toBeGreaterThanOrEqual(75);
    expect(score.tier).not.toBe('Reject');
  });

  test('enforces hard disqualifiers', () => {
    const input = workflowInputSchema.parse({});
    const company = {
      name: 'Acme University Equipment Lab',
      website: 'https://example.edu',
      domain: 'example.edu',
      location: 'Houston, Texas',
      employeeEstimate: 40,
      industry: 'Education',
      sourceUrls: ['https://example.edu'],
    };
    const evidence = buildResearchEvidence(company, 'University research lab and nonprofit school');

    const score = scoreCompanyFit(evidence, input.icpConfig);
    expect(score.tier).toBe('Reject');
    expect(score.disqualifierHits.length).toBeGreaterThan(0);
  });

  test('filters non-prospect search results before research', () => {
    const companies = extractCompaniesFromSearchResults(
      [
        {
          title: "Johannesburg's Most Trusted Import & Export Partner in South Africa",
          url: 'https://www.flexagonfreight.co.za/import-export/',
          snippet: 'Freight forwarding import export logistics',
        },
        {
          title: 'Used CWP Centering Reels for Sale',
          url: 'https://machinehub.com/listings/1665-cwp-pull-off-coil-reel-uncoiler-2-500-lbs',
          snippet: 'Used industrial machinery listing Dallas',
        },
        {
          title: 'What are the best examples for B2B ecommerce?',
          url: 'https://www.quora.com/What-are-the-best-examples-for-B2B-ecommerce',
          snippet: 'Question and answer forum',
        },
        {
          title: 'Acme Industrial Equipment',
          url: 'https://acmeindustrial.com/',
          snippet: 'Industrial machinery manufacturer Houston request a quote',
        },
      ],
      10,
    );

    expect(companies.map(company => company.domain)).toEqual(['acmeindustrial.com']);
  });

  test('hard rejects bad candidate page types during fit scoring', () => {
    const input = workflowInputSchema.parse({});
    const company = {
      name: 'Used CWP Centering Reels for Sale',
      website: 'https://machinehub.com',
      domain: 'machinehub.com',
      location: 'Dallas',
      industry: 'Industrial Machinery Manufacturing',
      sourceUrls: ['https://machinehub.com/listings/1665-cwp-pull-off-coil-reel-uncoiler-2-500-lbs'],
    };
    const evidence = buildResearchEvidence(company, 'Industrial machinery request a quote');
    const score = scoreCompanyFit(evidence, input.icpConfig);

    expect(getCandidateDisqualifiers(company)).toEqual(['marketplace-listing', 'not-company-homepage']);
    expect(score.totalScore).toBe(0);
    expect(score.tier).toBe('Reject');
    expect(score.disqualifierHits).toContain('marketplace-listing');
    expect(score.disqualifierHits).toContain('not-company-homepage');
  });

  test('validates outreach draft quality and flags unsupported claims', () => {
    const input = workflowInputSchema.parse({});
    const company = {
      name: 'Acme Industrial Equipment',
      website: 'https://acmeindustrial.com',
      domain: 'acmeindustrial.com',
      location: 'Houston, Texas',
      employeeEstimate: 300,
      industry: 'Industrial Machinery Manufacturing',
      sourceUrls: ['https://acmeindustrial.com'],
    };
    const evidence = buildResearchEvidence(company, 'Industrial machinery request a quote');
    const decisionMaker = inferDecisionMaker(company, input.icpConfig);
    const draft = draftOutreach(company, evidence, decisionMaker);

    expect(() => outreachDraftSchema.parse(draft)).not.toThrow();
    expect(scoreOutreachDraft(draft, evidence).grounded).toBe(true);
    expect(
      scoreOutreachDraft(
        {
          ...draft,
          body: `${draft.body}\nI reviewed your private analytics and guarantee more revenue.`,
        },
        evidence,
      ).issues,
    ).toContain('Draft contains unsupported or risky claims.');
  });
});

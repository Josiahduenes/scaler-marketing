import { describe, expect, test } from 'bun:test';
import { outreachDraftSchema, workflowInputSchema } from '../schemas/outreach';
import {
  buildResearchEvidence,
  draftOutreach,
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

import { afterEach, describe, expect, test } from 'bun:test';
import { draftReviewUpdateSchema, reviewStatusSchema } from '../schemas/outreach';
import { listRecentOutreachRuns, updateDraftReviewStatus } from '../tools/outreach-review-tool';

const originalBaseUrl = process.env.XANO_BASE_URL;
const originalToken = process.env.XANO_API_TOKEN;

afterEach(() => {
  if (originalBaseUrl === undefined) delete process.env.XANO_BASE_URL;
  else process.env.XANO_BASE_URL = originalBaseUrl;
  if (originalToken === undefined) delete process.env.XANO_API_TOKEN;
  else process.env.XANO_API_TOKEN = originalToken;
});

describe('outreach review schemas', () => {
  test('accepts expected review statuses', () => {
    expect(reviewStatusSchema.parse('approved')).toBe('approved');
    expect(reviewStatusSchema.parse('rejected')).toBe('rejected');
    expect(reviewStatusSchema.parse('needs-revision')).toBe('needs-revision');
    expect(() => reviewStatusSchema.parse('sent')).toThrow();
  });

  test('validates draft review updates', () => {
    expect(
      draftReviewUpdateSchema.parse({
        draftId: 'draft-1',
        status: 'approved',
        reviewerNote: 'Looks good.',
      }),
    ).toEqual({
      draftId: 'draft-1',
      status: 'approved',
      reviewerNote: 'Looks good.',
    });
  });
});

describe('outreach review tools', () => {
  test('listRecentOutreachRuns skips when Xano is not configured', async () => {
    delete process.env.XANO_BASE_URL;
    delete process.env.XANO_API_TOKEN;

    const result = await listRecentOutreachRuns();

    expect(result.configured).toBe(false);
    expect(result.runs).toEqual([]);
  });

  test('updateDraftReviewStatus skips cleanly when Xano is not configured', async () => {
    delete process.env.XANO_BASE_URL;
    delete process.env.XANO_API_TOKEN;

    const result = await updateDraftReviewStatus({
      draftId: 'draft-1',
      status: 'approved',
    });

    expect(result.configured).toBe(false);
    expect(result.updated).toBe(false);
    expect(result.status).toBe('approved');
  });
});

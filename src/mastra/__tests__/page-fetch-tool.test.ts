import { describe, expect, test } from 'bun:test';
import { buildCompanyResearchUrls } from '../tools/page-fetch-tool';

describe('page fetch research depth', () => {
  test('builds a bounded set of high-signal company research URLs', () => {
    expect(buildCompanyResearchUrls('https://example.com/products/widget?ref=search', 5)).toEqual([
      'https://example.com',
      'https://example.com/about',
      'https://example.com/about-us',
      'https://example.com/capabilities',
      'https://example.com/services',
    ]);
  });
});

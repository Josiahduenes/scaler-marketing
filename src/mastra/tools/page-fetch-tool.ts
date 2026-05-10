import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { extractPageText } from '../utils/outreach-utils';

const pageFetchInputSchema = z.object({
  url: z.string().url(),
  maxLength: z.number().int().positive().max(50_000).default(12_000),
});

const pageFetchOutputSchema = z.object({
  url: z.string().url(),
  text: z.string(),
  status: z.number(),
});

export async function fetchPageText(url: string, maxLength = 12_000, fetchImpl: typeof fetch = fetch) {
  const response = await fetchImpl(url, {
    headers: {
      'User-Agent': 'ScalerMarketingResearchBot/1.0',
      Accept: 'text/html,text/plain,application/xhtml+xml',
    },
    signal: AbortSignal.timeout(10_000),
  });

  const html = await response.text();
  return {
    url,
    text: extractPageText(html, maxLength),
    status: response.status,
  };
}

export function buildCompanyResearchUrls(website: string, maxPages = 7): string[] {
  const paths = ['/', '/about', '/about-us', '/capabilities', '/services', '/industries', '/case-studies', '/careers', '/contact'];

  try {
    const baseUrl = new URL(website);
    return [
      ...new Set(
        paths.map(path => {
          const url = new URL(path, baseUrl.origin);
          return url.toString().replace(/\/$/, '');
        }),
      ),
    ].slice(0, maxPages);
  } catch {
    return [website];
  }
}

export const pageFetchTool = createTool({
  id: 'page-fetch',
  description: 'Fetch and extract readable text from a public company web page.',
  inputSchema: pageFetchInputSchema,
  outputSchema: pageFetchOutputSchema,
  execute: async inputData => fetchPageText(inputData.url, inputData.maxLength),
});

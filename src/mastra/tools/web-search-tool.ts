import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { webSearchOutputSchema, webSearchResultSchema, type WebSearchResult } from '../schemas/outreach';

const searchInputSchema = z.object({
  query: z.string(),
  maxResults: z.number().int().positive().max(50).default(10),
});

export function normalizeSearchResponse(payload: unknown): WebSearchResult[] {
  const data = payload as {
    results?: unknown[];
    organic?: unknown[];
    webPages?: { value?: unknown[] };
    data?: {
      web?: unknown[];
      results?: unknown[];
    };
  };
  const rows = data.results || data.organic || data.webPages?.value || data.data?.web || data.data?.results || [];

  return rows
    .map(row => {
      const item = row as Record<string, unknown>;
      const url = String(item.url || item.link || item.href || '').trim();
      const title = String(item.title || item.name || '').trim();
      const snippet = String(item.snippet || item.description || item.text || '').trim();
      const parsed = webSearchResultSchema.safeParse({ title, url, snippet });
      return parsed.success ? parsed.data : undefined;
    })
    .filter((result): result is WebSearchResult => Boolean(result));
}

export async function runWebSearch(query: string, maxResults: number, fetchImpl: typeof fetch = fetch): Promise<WebSearchResult[]> {
  const baseUrl = process.env.WEB_SEARCH_BASE_URL;
  const apiKey = process.env.WEB_SEARCH_API_KEY;

  if (!baseUrl) {
    return [];
  }

  const url = new URL(baseUrl);
  const isFirecrawl = url.hostname.includes('firecrawl.dev') || url.pathname.includes('/v2/search');

  const response = isFirecrawl
    ? await fetchImpl(url, {
        method: 'POST',
        headers: {
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          limit: maxResults,
          sources: ['web'],
        }),
      })
    : await fetchImpl(withSearchParams(url, query, maxResults), {
        headers: apiKey
          ? {
              Authorization: `Bearer ${apiKey}`,
              'X-API-Key': apiKey,
            }
          : undefined,
      });

  if (!response.ok) {
    throw new Error(`Web search failed with ${response.status} ${response.statusText}`);
  }

  return normalizeSearchResponse(await response.json()).slice(0, maxResults);
}

function withSearchParams(url: URL, query: string, maxResults: number) {
  url.searchParams.set('q', query);
  url.searchParams.set('query', query);
  url.searchParams.set('count', String(maxResults));
  url.searchParams.set('limit', String(maxResults));
  return url;
}

export const webSearchTool = createTool({
  id: 'web-search',
  description: 'Search the public web for company prospecting research. Returns title, URL, and snippet only.',
  inputSchema: searchInputSchema,
  outputSchema: webSearchOutputSchema,
  execute: async inputData => {
    const maxResults = inputData.maxResults ?? 10;
    const results = await runWebSearch(inputData.query, maxResults);
    return {
      query: inputData.query,
      results,
    };
  },
});

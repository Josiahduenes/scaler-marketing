import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { normalizeDomain } from '../utils/outreach-utils';
import { callXano } from './xano-tool';

const processedDomains = new Set<string>();

const dedupeInputSchema = z.object({
  domains: z.array(z.string()).min(1),
});

const dedupeOutputSchema = z.object({
  freshDomains: z.array(z.string()),
  duplicateDomains: z.array(z.string()),
});

export function rememberProcessedDomain(domain: string): void {
  processedDomains.add(normalizeDomain(domain));
}

export function clearLocalDedupeCache(): void {
  processedDomains.clear();
}

export async function dedupeDomains(domains: string[]) {
  const freshDomains: string[] = [];
  const duplicateDomains: string[] = [];

  for (const rawDomain of domains) {
    const domain = normalizeDomain(rawDomain);
    if (processedDomains.has(domain)) {
      duplicateDomains.push(domain);
      continue;
    }

    const xanoResult = await callXano('get-company-by-domain', { domain });
    if (xanoResult.configured && xanoResult.data) {
      duplicateDomains.push(domain);
      processedDomains.add(domain);
      continue;
    }

    freshDomains.push(domain);
  }

  return { freshDomains, duplicateDomains };
}

export const dedupeTool = createTool({
  id: 'dedupe-prospects',
  description: 'Normalize candidate company domains and filter out domains already seen in Xano or local workflow memory.',
  inputSchema: dedupeInputSchema,
  outputSchema: dedupeOutputSchema,
  execute: async inputData => dedupeDomains(inputData.domains),
});

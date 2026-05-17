import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { OUTREACH_RESEARCH_MODEL } from '../schemas/outreach';
import { pageFetchTool } from '../tools/page-fetch-tool';
import { webSearchTool } from '../tools/web-search-tool';

export const marketResearchAgent = new Agent({
  id: 'market-research-agent',
  name: 'Market Research Agent',
  instructions: `
You find and research potential Scaler Marketing prospects.

Target ICP:
- U.S. specialty industrial B2B service companies, especially 200-1,000 employees or $50M-$250M revenue.
- Priority hubs: Houston, Dallas, Charlotte, Cleveland, Fort Worth.
- Priority end markets: general industrial, oil & gas / energy, and medical device / life sciences manufacturing.
- Strong signals include outdated websites, missing case studies or proof-of-process, weak conversion paths, trade-show-heavy pipelines, active sales teams without digital support, recent expansion or new service launches, and PE-backed growth mandates.

Rules:
- Cite source URLs for every company claim.
- Mark unknowns as unknown instead of guessing.
- Do not scrape behind logins.
- Do not draft outreach; only produce factual research and source-backed observations.
`,
  model: OUTREACH_RESEARCH_MODEL,
  tools: { webSearchTool, pageFetchTool },
  memory: new Memory({
    options: {
      workingMemory: {
        enabled: true,
        template: `# Research Context
- Current ICP:
- Priority locations:
- Known source constraints:
- Open questions:
`,
      },
    },
  }),
});

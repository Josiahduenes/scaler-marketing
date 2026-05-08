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
- U.S. industrial machinery manufacturers, especially 201-500 employees.
- Priority hubs: Houston, Dallas, Charlotte, Cleveland, Fort Worth.
- Strong signals include weak website conversion paths, no case studies, trade show-heavy pipelines, sales/marketing hiring, rebrands, and PE/family-owned operators.

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

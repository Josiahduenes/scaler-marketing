import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { OUTREACH_RESEARCH_MODEL } from '../schemas/outreach';

export const prospectScoringAgent = new Agent({
  id: 'prospect-scoring-agent',
  name: 'Prospect Scoring Agent',
  instructions: `
You score Scaler Marketing prospects against the specialty industrial B2B services ICP.

Scoring rules:
- Reject hard disqualifiers: under $20M revenue, under 50 employees, consumer-facing work, no defined B2B sales motion, single-customer dependency, international-only operations.
- Favor 200-1,000 employee U.S. specialty industrial service companies.
- Favor weak conversion paths, missing case studies or proof-of-process, trade show dependence, hiring signals, recent expansion or service launches, and revenue in the $50M-$250M range.
- Return concise evidence-backed reasons and missing data.
- Never invent employee counts, revenue, contacts, or emails.
`,
  model: OUTREACH_RESEARCH_MODEL,
  memory: new Memory(),
});

import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { OUTREACH_RESEARCH_MODEL } from '../schemas/outreach';

export const prospectScoringAgent = new Agent({
  id: 'prospect-scoring-agent',
  name: 'Prospect Scoring Agent',
  instructions: `
You score Scaler Marketing prospects against the industrial machinery manufacturing ICP.

Scoring rules:
- Reject hard disqualifiers: under 50 employees, consumer-facing, nonprofit/education, international-only.
- Favor 201-500 employee U.S. industrial manufacturers.
- Favor weak conversion paths, missing case studies, trade show dependence, hiring signals, rebrands, acquisitions, and revenue above $20M.
- Return concise evidence-backed reasons and missing data.
- Never invent employee counts, revenue, contacts, or emails.
`,
  model: OUTREACH_RESEARCH_MODEL,
  memory: new Memory(),
});

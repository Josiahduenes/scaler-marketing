import { z } from 'zod';
import { createScorer } from '@mastra/core/evals';
import {
  getAssistantMessageFromRunOutput,
  getUserMessageFromRunInput,
} from '@mastra/evals/scorers/utils';
import { OUTREACH_RESEARCH_MODEL } from '../schemas/outreach';

export const outreachGroundingScorer = createScorer({
  id: 'outreach-grounding-scorer',
  name: 'Outreach Grounding',
  description: 'Checks that Scaler outreach drafts are grounded, specific, concise, and compliant with V1 constraints.',
  type: 'agent',
  judge: {
    model: OUTREACH_RESEARCH_MODEL,
    instructions:
      'You evaluate B2B cold email drafts. Penalize unsupported claims, fake familiarity, missing source grounding, multiple CTAs, and copy outside 90-140 words. Return only structured JSON.',
  },
})
  .preprocess(({ run }) => ({
    userText: getUserMessageFromRunInput(run.input) || '',
    assistantText: getAssistantMessageFromRunOutput(run.output) || '',
  }))
  .analyze({
    description: 'Evaluate outreach draft quality and grounding',
    outputSchema: z.object({
      grounded: z.boolean(),
      concise: z.boolean(),
      singleCta: z.boolean(),
      riskyClaims: z.array(z.string()).default([]),
      explanation: z.string().default(''),
    }),
    createPrompt: ({ results }) => `
Evaluate the outreach output.

Input:
"""
${results.preprocessStepResult.userText}
"""

Output:
"""
${results.preprocessStepResult.assistantText}
"""

Return JSON with:
{
  "grounded": boolean,
  "concise": boolean,
  "singleCta": boolean,
  "riskyClaims": string[],
  "explanation": string
}
`,
  })
  .generateScore(({ results }) => {
    const r = (results as any)?.analyzeStepResult || {};
    let score = 1;
    if (!r.grounded) score -= 0.35;
    if (!r.concise) score -= 0.2;
    if (!r.singleCta) score -= 0.2;
    if ((r.riskyClaims || []).length > 0) score -= 0.25;
    return Math.max(0, score);
  })
  .generateReason(({ results, score }) => {
    const r = (results as any)?.analyzeStepResult || {};
    return `Outreach grounding score=${score}. grounded=${r.grounded ?? false}, concise=${r.concise ?? false}, singleCta=${r.singleCta ?? false}. ${(r.riskyClaims || []).join('; ')} ${r.explanation ?? ''}`;
  });

export const outreachScorers = {
  outreachGroundingScorer,
};

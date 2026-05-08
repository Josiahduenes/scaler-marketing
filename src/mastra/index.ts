
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { DuckDBStore } from "@mastra/duckdb";
import { MastraCompositeStore } from '@mastra/core/storage';
import { Observability, DefaultExporter, CloudExporter, SensitiveDataFilter } from '@mastra/observability';
import { weatherWorkflow } from './workflows/weather-workflow';
import { industrialLeadResearchWorkflow } from './workflows/industrial-lead-research-workflow';
import { weatherAgent } from './agents/weather-agent';
import { marketResearchAgent } from './agents/market-research-agent';
import { outreachDraftAgent } from './agents/outreach-draft-agent';
import { prospectScoringAgent } from './agents/prospect-scoring-agent';
import { scalerOutreachReviewAgent } from './agents/scaler-outreach-review-agent';
import { toolCallAppropriatenessScorer, completenessScorer, translationScorer } from './scorers/weather-scorer';
import { outreachGroundingScorer } from './scorers/outreach-scorer';

export const mastra = new Mastra({
  workflows: { weatherWorkflow, industrialLeadResearchWorkflow },
  agents: { weatherAgent, marketResearchAgent, prospectScoringAgent, outreachDraftAgent, scalerOutreachReviewAgent },
  scorers: { toolCallAppropriatenessScorer, completenessScorer, translationScorer, outreachGroundingScorer },
  storage: new MastraCompositeStore({
    id: 'composite-storage',
    default: new LibSQLStore({
      id: "mastra-storage",
      url: "file:./mastra.db",
    }),
    domains: {
      observability: await new DuckDBStore().getStore('observability'),
    }
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: 'mastra',
        exporters: [
          new DefaultExporter(), // Persists traces to storage for Mastra Studio
          new CloudExporter(), // Sends observability data to hosted Mastra Studio (if MASTRA_CLOUD_ACCESS_TOKEN is set)
        ],
        spanOutputProcessors: [
          new SensitiveDataFilter(), // Redacts sensitive data like passwords, tokens, keys
        ],
      },
    },
  }),
});

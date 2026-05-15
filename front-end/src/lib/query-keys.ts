export const queryKeys = {
  me: ['me'] as const,
  xanoHealth: ['xano-health'] as const,
  mastraHealth: ['mastra-health'] as const,
  runs: (limit = 20) => ['runs', limit] as const,
  runDetail: (runId: string) => ['run-detail', runId] as const,
  drafts: (status?: string) => ['drafts', status || 'all'] as const,
  emailOutbox: (status?: string) => ['email-outbox', status || 'all'] as const,
};

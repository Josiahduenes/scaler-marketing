import { MastraClient } from '@mastra/client-js';

export function mastraBaseUrl() {
  return (process.env.MASTRA_API_URL || 'http://localhost:4111').replace(/\/$/, '');
}

export function mastraClient() {
  return new MastraClient({
    baseUrl: mastraBaseUrl(),
  });
}

export function streamJsonFallback(payload: unknown) {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));
      controller.close();
    },
  });
}

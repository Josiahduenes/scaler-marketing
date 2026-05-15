import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { mastraClient, streamJsonFallback } from '@/lib/mastra';

const workflowInputSchema = z.object({
  targetCount: z.number().int().positive().max(50).default(10),
  locations: z.array(z.string().min(1)).min(1),
  maxSearchResults: z.number().int().positive().max(200).default(50),
  minimumFitScore: z.number().min(0).max(100).default(75),
});

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  try {
    const input = workflowInputSchema.parse(await request.json());
    const client = mastraClient() as any;
    const workflow = client.getWorkflow('industrial-lead-research-workflow');
    const run = await workflow.createRun({ resourceId: `xano-user-${auth.user.id}` });
    const stream = await run.stream({ inputData: input });

    if (stream?.body) {
      return new Response(stream.body, {
        headers: {
          'Content-Type': stream.headers?.get?.('content-type') || 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
        },
      });
    }

    if (stream?.stream) {
      return new Response(streamToNdjson(stream.stream), {
        headers: {
          'Content-Type': 'application/x-ndjson',
          'Cache-Control': 'no-cache',
        },
      });
    }

    return new Response(streamJsonFallback({ type: 'workflow-started', runId: run.runId }), {
      headers: { 'Content-Type': 'application/x-ndjson' },
    });
  } catch (error) {
    return new Response(
      streamJsonFallback({
        type: 'error',
        error: error instanceof Error ? error.message : 'Workflow stream failed',
      }),
      { status: 200, headers: { 'Content-Type': 'application/x-ndjson' } },
    );
  }
}

function streamToNdjson(source: AsyncIterable<unknown>) {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of source) {
          controller.enqueue(encoder.encode(`${JSON.stringify(chunk)}\n`));
        }
      } finally {
        controller.close();
      }
    },
  });
}

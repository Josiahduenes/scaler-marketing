import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { mastraClient, streamJsonFallback } from '@/lib/mastra';

const agentInputSchema = z.object({
  message: z.string().min(1),
  threadId: z.string().optional(),
  resourceId: z.string().optional(),
});

export async function POST(request: Request, context: { params: Promise<{ agentId: string }> }) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { agentId } = await context.params;

  try {
    const input = agentInputSchema.parse(await request.json());
    const client = mastraClient() as any;
    const agent = client.getAgent(agentId);
    const stream = await agent.stream(input.message, {
      memory: {
        thread: input.threadId || `dashboard-${auth.user.id}`,
        resource: input.resourceId || `xano-user-${auth.user.id}`,
      },
    });

    return new Response(stream.body, {
      headers: {
        'Content-Type': stream.headers?.get?.('content-type') || 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    return new Response(
      streamJsonFallback({
        type: 'error',
        error: error instanceof Error ? error.message : 'Agent stream failed',
      }),
      { status: 200, headers: { 'Content-Type': 'application/x-ndjson' } },
    );
  }
}

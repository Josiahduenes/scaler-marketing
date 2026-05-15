import { requireUser } from '@/lib/auth';
import { hostFromUrl } from '@/lib/format';
import { mastraBaseUrl } from '@/lib/mastra';

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const baseUrl = mastraBaseUrl();

  try {
    const response = await fetch(`${baseUrl}/api/agents`, { cache: 'no-store' });
    return Response.json({
      ok: response.ok,
      urlHost: hostFromUrl(baseUrl),
      status: response.status,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        urlHost: hostFromUrl(baseUrl),
        error: error instanceof Error ? error.message : 'Mastra is unreachable',
      },
      { status: 200 },
    );
  }
}

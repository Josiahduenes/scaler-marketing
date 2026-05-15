import { getCurrentUser, unauthorized } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  return Response.json(user);
}

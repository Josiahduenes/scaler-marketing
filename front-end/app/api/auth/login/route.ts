import { z } from 'zod';
import { setSessionToken } from '@/lib/auth';
import { userSchema } from '@/lib/schemas/outreach';
import { xanoAuthRequest, xanoErrorResponse } from '@/lib/xano';

const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const loginResponseSchema = z.object({
  authToken: z.string(),
  user_id: z.number(),
});

export async function POST(request: Request) {
  try {
    const input = loginInputSchema.parse(await request.json());
    const login = await xanoAuthRequest('/auth/login', loginResponseSchema, {
      method: 'POST',
      body: input,
    });

    await setSessionToken(login.authToken);

    const user = await xanoAuthRequest('/auth/me', userSchema, {
      token: login.authToken,
    });

    return Response.json(user);
  } catch (error) {
    return xanoErrorResponse(error);
  }
}

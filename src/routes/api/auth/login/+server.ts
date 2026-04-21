import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authenticate, createSession } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request, cookies }) => {
  const { email, password } = await request.json();

  if (!email || !password) {
    return json({ error: 'Email y contraseña requeridos' }, { status: 400 });
  }

  const account = authenticate(email, password);
  if (!account) {
    return json({ error: 'Email o contraseña incorrectos' }, { status: 401 });
  }

  const sessionId = createSession(account.id);
  const isProd = process.env.NODE_ENV === 'production';
  cookies.set('session', sessionId, {
    path: '/',
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60
  });

  return json({ success: true });
};

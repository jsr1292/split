import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createAccount, createSession } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request, cookies }) => {
  const { email, password, name } = await request.json();

  if (!email || !password || !name) {
    return json({ error: 'Todos los campos son requeridos' }, { status: 400 });
  }
  if (password.length < 6) {
    return json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });
  }

  try {
    const account = createAccount(email, password, name);
    const sessionId = createSession(account.id);
    cookies.set('session', sessionId, {
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60
    });
    return json({ success: true });
  } catch (e: any) {
    if (e.message?.includes('UNIQUE')) {
      return json({ error: 'Este email ya está registrado' }, { status: 400 });
    }
    return json({ error: 'Error al crear la cuenta' }, { status: 500 });
  }
};

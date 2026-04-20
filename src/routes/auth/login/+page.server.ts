import type { Actions } from './$types';
import { authenticate, createSession } from '$lib/server/auth';
import { json, redirect } from '@sveltejs/kit';

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const data = await request.formData();
    const email = data.get('email') as string;
    const password = data.get('password') as string;

    if (!email || !password) {
      return json({ error: 'Email y contraseña requeridos' }, { status: 400 });
    }

    const account = authenticate(email, password);
    if (!account) {
      return json({ error: 'Email o contraseña incorrectos' }, { status: 401 });
    }

    const sessionId = createSession(account.id);
    cookies.set('session', sessionId, {
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60
    });

    return json({ success: true, location: '/' }, { status: 200 });
  }
};

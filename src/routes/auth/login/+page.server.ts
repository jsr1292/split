import type { Actions } from './$types';
import { authenticate, createSession } from '$lib/server/auth';
import { fail, redirect } from '@sveltejs/kit';

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const data = await request.formData();
    const email = data.get('email') as string;
    const password = data.get('password') as string;

    if (!email || !password) {
      return fail(400, { error: 'Email y contraseña requeridos' });
    }

    const account = authenticate(email, password);
    if (!account) {
      return fail(401, { error: 'Email o contraseña incorrectos' });
    }

    const sessionId = createSession(account.id);
    cookies.set('session', sessionId, {
      path: '/',
      httpOnly: true,
      secure: false, // self-hosted, might not have HTTPS
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 // 30 days
    });

    throw redirect(303, '/');
  }
};

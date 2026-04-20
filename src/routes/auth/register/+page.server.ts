import type { Actions } from './$types';
import { createAccount, createSession } from '$lib/server/auth';
import { fail, redirect } from '@sveltejs/kit';

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const data = await request.formData();
    const email = data.get('email') as string;
    const password = data.get('password') as string;
    const name = data.get('name') as string;

    if (!email || !password || !name) {
      return fail(400, { error: 'Todos los campos son requeridos' });
    }
    if (password.length < 6) {
      return fail(400, { error: 'La contraseña debe tener al menos 6 caracteres' });
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
      throw redirect(303, '/');
    } catch (e: any) {
      if (e.status === 303) throw e;
      if (e.message?.includes('UNIQUE')) {
        return fail(400, { error: 'Este email ya está registrado' });
      }
      return fail(500, { error: 'Error al crear la cuenta' });
    }
  }
};

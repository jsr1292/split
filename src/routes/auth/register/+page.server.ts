import type { Actions } from './$types';
import { createAccount, createSession } from '$lib/server/auth';
import { json } from '@sveltejs/kit';

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const data = await request.formData();
    const email = data.get('email') as string;
    const password = data.get('password') as string;
    const name = data.get('name') as string;

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
      return json({ success: true, location: '/' }, { status: 200 });
    } catch (e: any) {
      if (e.message?.includes('UNIQUE')) {
        return json({ error: 'Este email ya está registrado' }, { status: 400 });
      }
      return json({ error: 'Error al crear la cuenta' }, { status: 500 });
    }
  }
};

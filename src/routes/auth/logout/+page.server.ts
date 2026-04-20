import type { Actions } from './$types';
import { deleteSession } from '$lib/server/auth';
import { redirect } from '@sveltejs/kit';

export const actions: Actions = {
  default: async ({ cookies }) => {
    const sessionId = cookies.get('session');
    if (sessionId) deleteSession(sessionId);
    cookies.delete('session', { path: '/' });
    throw redirect(303, '/auth/login');
  }
};

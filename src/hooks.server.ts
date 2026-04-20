import type { Handle } from '@sveltejs/kit';
import { getSession } from '$lib/server/auth';
import { getDb } from '$lib/server/db';

const PUBLIC_PATHS = ['/auth/login', '/auth/register', '/api'];

export const handle: Handle = async ({ event, resolve }) => {
  const sessionId = event.cookies.get('session');
  const isPublic = PUBLIC_PATHS.some(p => event.url.pathname.startsWith(p));

  if (sessionId) {
    const session = getSession(sessionId);
    if (session) {
      event.locals.user = { id: session.account_id, email: session.email, name: session.name };
      const db = getDb();
      const user = db.prepare('SELECT * FROM users WHERE account_id = ?').get(session.account_id) as any;
      if (user) event.locals.userId = user.id;
    } else {
      event.cookies.delete('session', { path: '/' });
    }
  }

  if (!event.locals.user && !isPublic) {
    // Allow static assets
    if (!event.url.pathname.startsWith('/_app') && !event.url.pathname.includes('.')) {
      return new Response(null, {
        status: 302,
        headers: { location: '/auth/login' }
      });
    }
  }

  return resolve(event);
};

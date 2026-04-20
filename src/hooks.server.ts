import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { getSession } from '$lib/server/auth';
import { getDb } from '$lib/server/db';

const PUBLIC_PATHS = ['/auth/login', '/auth/register', '/auth/logout', '/api'];

export const handle: Handle = async ({ event, resolve }) => {
  const sessionId = event.cookies.get('session');
  const isPublic = PUBLIC_PATHS.some(p => event.url.pathname.startsWith(p));

  if (sessionId) {
    try {
      const session = getSession(sessionId);
      if (session) {
        event.locals.user = { id: session.account_id, email: session.email, name: session.name };
        const db = getDb();
        const user = db.prepare('SELECT * FROM users WHERE account_id = ?').get(session.account_id) as any;
        if (user) event.locals.userId = user.id;
      } else {
        event.cookies.delete('session', { path: '/' });
      }
    } catch (e) {
      console.error('Session error:', e);
      event.cookies.delete('session', { path: '/' });
    }
  }

  if (!event.locals.user && !isPublic) {
    // Allow static assets and service worker
    if (!event.url.pathname.startsWith('/_app') && !event.url.pathname.includes('.') && event.url.pathname !== '/sw.js' && event.url.pathname !== '/manifest.json') {
      redirect(302, '/auth/login');
    }
  }

  return resolve(event);
};

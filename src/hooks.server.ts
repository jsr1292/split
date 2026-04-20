import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { getSession } from '$lib/server/auth';
import { getDb } from '$lib/server/db';

const PUBLIC_PATHS = ['/auth/login', '/auth/register', '/auth/logout', '/api'];

export const handle: Handle = async ({ event, resolve }) => {
  const sessionId = event.cookies.get('session');
  const isPublic = PUBLIC_PATHS.some(p => event.url.pathname.startsWith(p));

  console.log(`[hooks] ${event.request.method} ${event.url.pathname} | cookie: ${sessionId ? sessionId.substring(0, 8) + '...' : 'none'} | public: ${isPublic}`);

  if (sessionId) {
    try {
      const session = getSession(sessionId);
      if (session) {
        event.locals.user = { id: session.account_id, email: session.email, name: session.name };
        const db = getDb();
        const user = db.prepare('SELECT * FROM users WHERE account_id = ?').get(session.account_id) as any;
        if (user) event.locals.userId = user.id;
        console.log(`[hooks] ✓ authenticated as ${session.name}`);
      } else {
        console.log(`[hooks] ✗ session expired/invalid`);
        event.cookies.delete('session', { path: '/' });
      }
    } catch (e) {
      console.error('[hooks] session error:', e);
      event.cookies.delete('session', { path: '/' });
    }
  }

  if (!event.locals.user && !isPublic) {
    if (!event.url.pathname.startsWith('/_app') && !event.url.pathname.includes('.') && event.url.pathname !== '/sw.js' && event.url.pathname !== '/manifest.json' && event.url.pathname !== '/redirect.html') {
      console.log(`[hooks] → redirecting to /auth/login`);
      redirect(302, '/auth/login');
    }
  }

  return resolve(event);
};

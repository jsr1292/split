import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { getSession } from '$lib/server/auth';
import { getDb } from '$lib/server/db';

const PUBLIC_PATHS = ['/auth/login', '/auth/register', '/auth/logout', '/api'];

// In-memory rate limiter for auth endpoints
// Key: IP, Value: { count, resetAt }
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 10; // max 10 attempts per window

function rateLimit(key: string, max: number = RATE_LIMIT_MAX): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return false; // not rate limited
  }

  entry.count++;
  if (entry.count > max) {
    return true; // rate limited
  }
  return false;
}

export const handle: Handle = async ({ event, resolve }) => {
  const ip = event.getClientAddress();
  const path = event.url.pathname;

  // Rate limit auth endpoints
  if (path.startsWith('/api/auth/')) {
    if (rateLimit(ip)) {
      return new Response(JSON.stringify({ error: 'Demasiados intentos. Inténtalo en 15 minutos.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // CSRF protection for API mutations
  // Only block if there's an Origin/Referer that explicitly doesn't match (cross-site attack)
  const method = event.request.method;
  if (method !== 'GET' && method !== 'HEAD' && path.startsWith('/api/')) {
    const origin = event.request.headers.get('origin');
    const referer = event.request.headers.get('referer');
    const host = event.url.host;
    // Block only if origin/referer is set AND doesn't match our host
    const badOrigin = origin && !origin.includes(host) && !origin.includes('localhost') && !origin.includes('127.0.0.1');
    const badReferer = referer && !referer.includes(host) && !referer.includes('localhost') && !referer.includes('127.0.0.1');
    if (origin && badOrigin && badReferer) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  const sessionId = event.cookies.get('session');
  const isPublic = PUBLIC_PATHS.some(p => path.startsWith(p));

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
    } catch {
      event.cookies.delete('session', { path: '/' });
    }
  }

  if (!event.locals.user && !isPublic) {
    if (
      !path.startsWith('/_app') &&
      !path.includes('.') &&
      path !== '/sw.js' &&
      path !== '/manifest.json' &&
      path !== '/redirect.html'
    ) {
      redirect(302, '/auth/login');
    }
  }

  return resolve(event);
};

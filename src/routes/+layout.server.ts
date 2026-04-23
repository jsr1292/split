import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, request }) => {
  if (!locals.user) return { user: null, locale: 'es-ES' };
  // Detect locale from Accept-Language header for SSR
  const acceptLang = request.headers.get('accept-language') || '';
  const locale = acceptLang.match(/^[a-z]{2}-[A-Z]{2}/)?.[0] || 'es-ES';
  return { user: locals.user, locale };
};

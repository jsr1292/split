import { getDashboard, getSelfUser } from '$lib/server/db/queries';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) return { self: null, dashboard: null };
  const self = getSelfUser(locals.user.id) as any;
  if (!self) return { self: null, dashboard: null };
  const dashboard = getDashboard(self.id);
  return { self, dashboard };
};

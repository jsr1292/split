import { getDashboard, getSelfUser, getDb } from '$lib/server/db/queries';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const self = getSelfUser();
  if (!self) return { self: null, dashboard: null };

  const dashboard = getDashboard(self.id);
  return { self, dashboard };
};

import type { PageServerLoad } from './$types';
import { getDashboard, getSelfUser } from '$lib/server/db/queries';

export const load: PageServerLoad = async () => {
  const self = getSelfUser() as any;
  if (!self) return { dashboard: null };
  const dashboard = getDashboard(self.id);
  return { dashboard };
};

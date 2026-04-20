import type { PageServerLoad } from './$types';
import { getAllUsers, getSelfUser } from '$lib/server/db/queries';

export const load: PageServerLoad = async ({ locals }) => {
  const self = getSelfUser(locals.user?.id) as any;
  const people = getAllUsers();
  return { self, people };
};

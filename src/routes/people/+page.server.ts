import type { PageServerLoad } from './$types';
import { getAllUsers, getSelfUser } from '$lib/server/db/queries';

export const load: PageServerLoad = async () => {
  const self = getSelfUser() as any;
  const people = getAllUsers();
  return { people, self };
};

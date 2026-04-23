import type { PageServerLoad } from './$types';
import { getUsersInSharedGroups, getSelfUser } from '$lib/server/db/queries';

export const load: PageServerLoad = async ({ locals }) => {
  const self = getSelfUser(locals.user?.id) as any;
  if (!self) return { people: [], self };

  const people = getUsersInSharedGroups(self.id);
  return { people, self };
};

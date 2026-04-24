import type { PageServerLoad } from './$types';
import { getUsersInSharedGroups, getSelfUser } from '$lib/server/db/queries';
import { getSupportedCurrencies } from '$lib/server/currency';

export const load: PageServerLoad = async ({ locals }) => {
  const self = getSelfUser(locals.user?.id) as any;
  const people = self ? getUsersInSharedGroups(self.id) : [];
  const currencies = getSupportedCurrencies();
  return { self, people, currencies };
};

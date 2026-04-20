import type { PageServerLoad } from './$types';
import { getAllGroups, getUserBalanceInGroup, getSelfUser } from '$lib/server/db/queries';

export const load: PageServerLoad = async ({ locals }) => {
  const self = getSelfUser(locals.user?.id) as any;
  const groups = getAllGroups();
  const groupsWithBalance = groups.map((g: any) => ({
    ...g,
    balance: self ? getUserBalanceInGroup(g.id, self.id) : 0
  }));
  return { groups: groupsWithBalance };
};

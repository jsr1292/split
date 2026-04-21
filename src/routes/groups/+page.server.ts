import type { PageServerLoad } from './$types';
import { getAllGroups, getUserBalancesForGroups, getSelfUser } from '$lib/server/db/queries';

export const load: PageServerLoad = async ({ locals }) => {
  const self = getSelfUser(locals.user?.id) as any;
  const groups = getAllGroups();

  // Batch: compute all balances in 2 queries instead of N
  const balances = getUserBalancesForGroups(
    groups.map((g: any) => g.id),
    self?.id
  );

  const groupsWithBalance = groups.map((g: any) => ({
    ...g,
    balance: balances[g.id] ?? 0
  }));

  return { groups: groupsWithBalance };
};

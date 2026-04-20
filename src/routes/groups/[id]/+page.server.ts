import type { PageServerLoad } from './$types';
import { getGroupById, getGroupMembers, getExpensesByGroup, getGroupBalances, getSettlements, getUserBalanceInGroup, getSelfUser } from '$lib/server/db/queries';

export const load: PageServerLoad = async ({ params }) => {
  const self = getSelfUser() as any;
  const group = getGroupById(params.id) as any;
  if (!group) return { group: null };

  const members = getGroupMembers(params.id);
  const expenses = getExpensesByGroup(params.id);
  const balances = getGroupBalances(params.id);
  const settlements = getSettlements(params.id);
  const myBalance = self ? getUserBalanceInGroup(params.id, self.id) : 0;

  return { group, members, expenses, balances, settlements, myBalance, self };
};

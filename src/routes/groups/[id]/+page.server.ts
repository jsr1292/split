import type { PageServerLoad } from './$types';
import { getGroupById, getGroupMembers, getExpensesByGroup, getGroupBalances, getSettlements, getUserBalanceInGroup, getSelfUser, isGroupMember } from '$lib/server/db/queries';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, locals }) => {
  const self = getSelfUser(locals.user?.id) as any;
  const group = getGroupById(params.id) as any;
  if (!group) throw error(404, 'Group not found');

  // Membership check — reject if user is not in this group
  if (self && !isGroupMember(params.id, self.id)) {
    throw error(403, 'You are not a member of this group');
  }

  const members = getGroupMembers(params.id);
  const expenses = getExpensesByGroup(params.id);
  const balances = getGroupBalances(params.id);
  const settlements = getSettlements(params.id);
  const myBalance = self ? getUserBalanceInGroup(params.id, self.id) : 0;
  const userBaseCurrency = self?.base_currency || 'EUR';

  // Compute category totals from already-fetched expenses (no extra DB query)
  const catMap: Record<string, any> = {};
  for (const e of expenses) {
    if (!catMap[e.category]) catMap[e.category] = { category: e.category, total: 0, count: 0 };
    catMap[e.category].total += e.amount;
    catMap[e.category].count++;
  }
  const categories = Object.values(catMap).sort((a: any, b: any) => b.total - a.total);

  // Who should pay next: person with most negative balance (owes the most)
  const netBalances: Record<string, number> = {};
  for (const m of members) {
    netBalances[m.id] = 0;
  }
  for (const b of balances) {
    netBalances[b.from_user] = (netBalances[b.from_user] || 0) - b.amount;
    netBalances[b.to_user] = (netBalances[b.to_user] || 0) + b.amount;
  }

  let suggestedPayer: any = null;
  let minBalance = Infinity;
  for (const m of members) {
    const bal = netBalances[m.id] || 0;
    if (bal < minBalance) {
      minBalance = bal;
      suggestedPayer = m;
    }
  }
  if (!suggestedPayer && self) {
    suggestedPayer = members.find((m: any) => m.id === self.id) || members[0];
  }

  return { group, members, expenses, balances, settlements, myBalance, self, categories, suggestedPayer, userBaseCurrency };
};

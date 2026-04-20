import type { PageServerLoad } from './$types';
import { getGroupById, getGroupMembers, getExpensesByGroup, getGroupBalances, getSettlements, getUserBalanceInGroup, getSelfUser, getDb } from '$lib/server/db/queries';

export const load: PageServerLoad = async ({ params, locals }) => {
  const self = getSelfUser(locals.user?.id) as any;
  const group = getGroupById(params.id) as any;
  if (!group) return { group: null };

  const members = getGroupMembers(params.id);
  const expenses = getExpensesByGroup(params.id);
  const balances = getGroupBalances(params.id);
  const settlements = getSettlements(params.id);
  const myBalance = self ? getUserBalanceInGroup(params.id, self.id) : 0;
  const userBaseCurrency = self?.base_currency || 'EUR';

  const categories = getDb().prepare(`
    SELECT e.category, SUM(e.amount) as total, COUNT(*) as count
    FROM expenses e
    WHERE e.group_id = ?
    GROUP BY e.category
    ORDER BY total DESC
  `).all(params.id);

  // Who should pay next: person with most negative balance (owes the most)
  // Calculate net balance per member
  const netBalances: Record<string, number> = {};
  for (const m of members) {
    netBalances[m.id] = 0;
  }
  for (const b of balances) {
    // b.from_user owes b.to_user amount b.amount
    // from_user's balance decreases (they owe), to_user's balance increases (they are owed)
    netBalances[b.from_user] = (netBalances[b.from_user] || 0) - b.amount;
    netBalances[b.to_user] = (netBalances[b.to_user] || 0) + b.amount;
  }

  // Find member with most negative balance (owes most)
  let suggestedPayer: any = null;
  let minBalance = Infinity;
  for (const m of members) {
    const bal = netBalances[m.id] || 0;
    if (bal < minBalance) {
      minBalance = bal;
      suggestedPayer = m;
    }
  }
  // If everyone is at 0, pick the self user
  if (!suggestedPayer && self) {
    suggestedPayer = members.find((m: any) => m.id === self.id) || members[0];
  }

  return { group, members, expenses, balances, settlements, myBalance, self, categories, suggestedPayer, userBaseCurrency };
};

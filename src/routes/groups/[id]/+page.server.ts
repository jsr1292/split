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

  const categories = getDb().prepare(`
    SELECT e.category, SUM(e.amount) as total, COUNT(*) as count
    FROM expenses e
    WHERE e.group_id = ?
    GROUP BY e.category
    ORDER BY total DESC
  `).all(params.id);

  return { group, members, expenses, balances, settlements, myBalance, self, categories };
};

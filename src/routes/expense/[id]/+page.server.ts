import type { PageServerLoad } from './$types';
import { getExpenseById, getExpenseSplits, getExpenseItems, getExpenseItemSplitsForItems, getSelfUser, isGroupMember } from '$lib/server/db/queries';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, locals }) => {
  const self = getSelfUser(locals.user?.id) as any;
  const expense = getExpenseById(params.id) as any;
  if (!expense) throw error(404, 'Expense not found');

  // Check membership
  if (self && !isGroupMember(expense.group_id, self.id)) {
    throw error(403, 'Not authorized');
  }

  const splits = getExpenseSplits(params.id);
  const items = getExpenseItems(params.id);
  const splitsMap = getExpenseItemSplitsForItems(items.map((i: any) => i.id));
  const itemsWithSplits = items.map((item: any) => ({
    ...item,
    splits: splitsMap[item.id] || []
  }));
  return { expense, splits, items: itemsWithSplits, self, userBaseCurrency: self?.base_currency || 'EUR' };
};

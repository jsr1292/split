import type { PageServerLoad } from './$types';
import { getExpenseById, getExpenseSplits, getExpenseItems, getExpenseItemSplitsForItems, getSelfUser } from '$lib/server/db/queries';

export const load: PageServerLoad = async ({ params, locals }) => {
  const self = getSelfUser(locals.user?.id) as any;
  const expense = getExpenseById(params.id) as any;
  if (!expense) return { expense: null };
  const splits = getExpenseSplits(params.id);
  const items = getExpenseItems(params.id);
  // Batch-fetch all splits for all items in one query (was N queries, now 1)
  const splitsMap = getExpenseItemSplitsForItems(items.map((i: any) => i.id));
  const itemsWithSplits = items.map((item: any) => ({
    ...item,
    splits: splitsMap[item.id] || []
  }));
  return { expense, splits, items: itemsWithSplits, self, userBaseCurrency: self?.base_currency || 'EUR' };
};

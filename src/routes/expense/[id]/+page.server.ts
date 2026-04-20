import type { PageServerLoad } from './$types';
import { getExpenseById, getExpenseSplits, getExpenseItems, getExpenseItemSplits } from '$lib/server/db/queries';

export const load: PageServerLoad = async ({ params }) => {
  const expense = getExpenseById(params.id) as any;
  if (!expense) return { expense: null };
  const splits = getExpenseSplits(params.id);
  const items = getExpenseItems(params.id);
  const itemsWithSplits = items.map((item: any) => ({
    ...item,
    splits: getExpenseItemSplits(item.id)
  }));
  return { expense, splits, items: itemsWithSplits };
};

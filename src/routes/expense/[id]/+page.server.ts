import type { PageServerLoad } from './$types';
import { getExpenseById, getExpenseSplits } from '$lib/server/db/queries';

export const load: PageServerLoad = async ({ params }) => {
  const expense = getExpenseById(params.id) as any;
  if (!expense) return { expense: null };
  const splits = getExpenseSplits(params.id);
  return { expense, splits };
};

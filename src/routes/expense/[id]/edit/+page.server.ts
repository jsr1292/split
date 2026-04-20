import { getExpenseById, getExpenseSplits, getGroupMembers } from '$lib/server/db/queries';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const expense = getExpenseById(params.id);
  if (!expense) throw error(404, 'Expense not found');

  const splits = getExpenseSplits(params.id);
  const members = getGroupMembers(expense.group_id);
  const splitUserIds = splits.map((s: any) => s.user_id);

  return { expense, splits, members, splitUserIds };
};

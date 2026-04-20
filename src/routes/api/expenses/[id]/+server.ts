import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { deleteExpense, getExpenseById } from '$lib/server/db/queries';

export const DELETE: RequestHandler = async ({ params }) => {
  const expense = getExpenseById(params.id);
  if (!expense) return json({ error: 'Not found' }, { status: 404 });
  deleteExpense(params.id);
  return json({ ok: true });
};

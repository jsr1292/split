import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { updateExpense, getExpenseById } from '$lib/server/db/queries';

export const PUT: RequestHandler = async ({ params, request, locals }) => {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

  const expense = getExpenseById(params.id);
  if (!expense) return json({ error: 'Not found' }, { status: 404 });

  const { description, amount, paidBy, category, date, note, splitUserIds } = await request.json();
  if (!description || !amount || !paidBy) {
    return json({ error: 'Missing fields' }, { status: 400 });
  }
  updateExpense(params.id, { description, amount: parseFloat(amount), paidBy, category, date, note, splitUserIds });
  return json({ ok: true });
};

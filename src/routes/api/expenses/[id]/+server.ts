import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { updateExpense, getExpenseById } from '$lib/server/db/queries';

export const PUT: RequestHandler = async ({ params, request }) => {
  const { description, amount, paidBy, category, date, note, splitUserIds } = await request.json();
  if (!description || !amount || !paidBy) {
    return json({ error: 'Missing fields' }, { status: 400 });
  }
  updateExpense(params.id, { description, amount: parseFloat(amount), paidBy, category, date, note, splitUserIds });
  return json({ ok: true });
};

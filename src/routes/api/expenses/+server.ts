import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createExpense } from '$lib/server/db/queries';

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const { groupId, description, amount, paidBy, splitType, category, date, note, splitUserIds, createdBy } = body;

  if (!groupId || !description || !amount || !paidBy || !date || !splitUserIds?.length) {
    return json({ error: 'Missing required fields' }, { status: 400 });
  }

  const expense = createExpense(
    groupId, description, parseFloat(amount), paidBy,
    splitType || 'equal', category || 'other', date,
    splitUserIds, undefined, createdBy, note
  );

  return json(expense);
};

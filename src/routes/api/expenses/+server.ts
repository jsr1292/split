import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createExpense, createRecurringInstances, createExpenseWithItems } from '$lib/server/db/queries';

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const { groupId, description, amount, paidBy, splitType, category, date, note, splitUserIds, createdBy, recurring, items } = body;

  if (!groupId || !description || !amount || !paidBy || !date || !splitUserIds?.length) {
    return json({ error: 'Missing required fields' }, { status: 400 });
  }

  let expense;
  if (items && items.length > 0) {
    expense = createExpenseWithItems(
      groupId, description, parseFloat(amount), paidBy,
      splitType || 'equal', category || 'other', date,
      splitUserIds, createdBy, note, items, recurring
    );
  } else {
    expense = createExpense(
      groupId, description, parseFloat(amount), paidBy,
      splitType || 'equal', category || 'other', date,
      splitUserIds, undefined, createdBy, note, recurring
    );
  }

  // Generate recurring instances if this is a recurring expense
  if (recurring && recurring !== 'no') {
    createRecurringInstances(expense, recurring);
  }

  return json(expense);
};

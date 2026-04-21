import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createExpense, createRecurringInstances, createExpenseWithItems } from '$lib/server/db/queries';

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const { groupId, description, amount, paidBy, splitType, category, date, note, splitUserIds, createdBy, recurring, items, currency, idempotency_key } = body;

  if (!groupId || !description || !amount || !paidBy || !date || !splitUserIds?.length) {
    return json({ error: 'Missing required fields' }, { status: 400 });
  }

  let result;
  if (items && items.length > 0) {
    result = createExpenseWithItems(
      groupId, description, parseFloat(amount), paidBy,
      splitType || 'equal', category || 'other', date,
      splitUserIds, createdBy, note, items, recurring, currency
    );
  } else {
    result = createExpense(
      groupId, description, parseFloat(amount), paidBy,
      splitType || 'equal', category || 'other', date,
      splitUserIds, undefined, createdBy, note, recurring, undefined, currency,
      idempotency_key
    );
  }

  const { expense, created } = result;

  // Generate recurring instances if this is a recurring expense and it was newly created
  if (recurring && recurring !== 'no' && created) {
    createRecurringInstances(expense, recurring);
  }

  return json({ expense, created });
};

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createExpense, createRecurringInstances, createExpenseWithItems, getGroupMembers } from '$lib/server/db/queries';

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { groupId, description, amount, paidBy, splitType, category, date, note, splitUserIds, createdBy, recurring, items, currency, idempotency_key } = body;

  const parsedAmount = parseFloat(amount);
  if (!groupId || !description || !parsedAmount || parsedAmount <= 0 || !paidBy || !date || !splitUserIds?.length) {
    return json({ error: 'Missing or invalid required fields' }, { status: 400 });
  }

  // Validate group membership
  const members = getGroupMembers(groupId);
  if (!members.some((m: any) => m.account_id === locals.user!.id)) {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  let result;
  if (items && items.length > 0) {
    result = createExpenseWithItems(
      groupId, description, parsedAmount, paidBy,
      splitType || 'equal', category || 'other', date,
      splitUserIds, createdBy, note, items, recurring, currency
    );
  } else {
    result = createExpense(
      groupId, description, parsedAmount, paidBy,
      splitType || 'equal', category || 'other', date,
      splitUserIds, undefined, createdBy, note, recurring, undefined, currency,
      idempotency_key
    );
  }

  const { expense, created } = result;

  if (recurring && recurring !== 'no' && created) {
    createRecurringInstances(expense, recurring);
  }

  return json({ expense, created });
};

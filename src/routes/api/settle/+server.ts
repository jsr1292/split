import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSettlement, getGroupMembers, getGroupBalances } from '$lib/server/db/queries';

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

  const { groupId, fromUser, toUser, amount, date } = await request.json();
  const parsedAmount = parseFloat(amount);
  if (!groupId || !fromUser || !toUser || !parsedAmount || parsedAmount <= 0 || !date) {
    return json({ error: 'Missing or invalid fields' }, { status: 400 });
  }
  if (fromUser === toUser) {
    return json({ error: 'fromUser and toUser cannot be the same' }, { status: 400 });
  }

  // Verify membership
  const members = getGroupMembers(groupId);
  if (!members.some((m: any) => m.account_id === locals.user!.id)) {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  // Check settlement doesn't exceed actual debt
  const balances = getGroupBalances(groupId);
  const actualDebt = balances
    .filter((b: any) => b.from_user === fromUser && b.to_user === toUser)
    .reduce((sum: number, b: any) => sum + b.amount, 0);
  if (parsedAmount > actualDebt + 0.01) {
    return json({ error: `Settlement amount (${parsedAmount.toFixed(2)}) exceeds actual debt (${actualDebt.toFixed(2)})` }, { status: 400 });
  }

  const id = createSettlement(groupId, fromUser, toUser, parsedAmount, date);
  return json({ id, ok: true });
};

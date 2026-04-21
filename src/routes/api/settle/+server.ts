import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSettlement } from '$lib/server/db/queries';

export const POST: RequestHandler = async ({ request }) => {
  const { groupId, fromUser, toUser, amount, date } = await request.json();
  const parsedAmount = parseFloat(amount);
  if (!groupId || !fromUser || !toUser || !parsedAmount || parsedAmount <= 0 || !date) {
    return json({ error: 'Missing or invalid fields' }, { status: 400 });
  }
  const id = createSettlement(groupId, fromUser, toUser, parsedAmount, date);
  return json({ id, ok: true });
};

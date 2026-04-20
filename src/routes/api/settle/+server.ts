import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSettlement } from '$lib/server/db/queries';

export const POST: RequestHandler = async ({ request }) => {
  const { groupId, fromUser, toUser, amount, date } = await request.json();
  if (!groupId || !fromUser || !toUser || !amount || !date) {
    return json({ error: 'Missing fields' }, { status: 400 });
  }
  const id = createSettlement(groupId, fromUser, toUser, parseFloat(amount), date);
  return json({ id, ok: true });
};

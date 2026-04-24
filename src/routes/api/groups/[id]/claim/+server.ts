import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getGroupById, getGroupMembers, getDb } from '$lib/server/db/queries';

export const POST: RequestHandler = async ({ params, request, locals }) => {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

  const group = getGroupById(params.id);
  if (!group) return json({ error: 'Group not found' }, { status: 404 });

  const members = getGroupMembers(params.id);
  const memberIds = members.map((m: any) => m.id);

  const { ghostUserId } = await request.json();
  if (!ghostUserId) return json({ error: 'ghostUserId required' }, { status: 400 });

  // Verify ghost user is in this group
  if (!memberIds.includes(ghostUserId)) {
    return json({ error: 'Ghost user not found in group' }, { status: 404 });
  }

  const db = getDb();
  const ghostUser = db.prepare('SELECT * FROM users WHERE id = ?').get(ghostUserId) as any;
  if (!ghostUser) return json({ error: 'Ghost user not found' }, { status: 404 });

  // Verify ghost user has no account
  if (ghostUser.account_id) {
    return json({ error: 'User already has an account' }, { status: 400 });
  }

  // Claim the ghost user: update account_id, email, and optionally name
  const updates: string[] = ['account_id = ?'];
  const values: any[] = [locals.user.id];

  if (locals.user.email) {
    updates.push('email = ?');
    values.push(locals.user.email);
  }

  values.push(ghostUserId);
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  // Update the user's is_self flag if this is the first account (first account is always self)
  const existingSelf = db.prepare('SELECT * FROM users WHERE account_id = ? AND is_self = 1').get(locals.user.id);
  if (!existingSelf) {
    db.prepare('UPDATE users SET is_self = 1 WHERE id = ?').run(ghostUserId);
  }

  return json({ ok: true, ghostUserId });
};

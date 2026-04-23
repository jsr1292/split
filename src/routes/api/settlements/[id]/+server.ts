import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { deleteSettlement, getDb, getSelfUser, isGroupMember } from '$lib/server/db/queries';

export const DELETE: RequestHandler = async ({ params, locals }) => {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const self = getSelfUser(locals.user.id) as any;
  if (!self) return json({ error: 'Unauthorized' }, { status: 401 });

  // Get the settlement to check group membership
  const settlement = getDb().prepare('SELECT group_id FROM settlements WHERE id = ?').get(params.id) as any;
  if (!settlement) return json({ error: 'Not found' }, { status: 404 });

  if (!isGroupMember(settlement.group_id, self.id)) {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  deleteSettlement(params.id);
  return json({ ok: true });
};

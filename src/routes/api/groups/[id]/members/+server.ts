import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getGroupMembers, isGroupMember, getSelfUser } from '$lib/server/db/queries';

export const GET: RequestHandler = async ({ params, locals }) => {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const self = getSelfUser(locals.user.id) as any;
  if (!self || !isGroupMember(params.id, self.id)) {
    return json({ error: 'Forbidden' }, { status: 403 });
  }
  const members = getGroupMembers(params.id);
  return json(members);
};

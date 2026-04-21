import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { updateGroup, getGroupById, getGroupMembers } from '$lib/server/db/queries';

export const PUT: RequestHandler = async ({ params, request, locals }) => {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

  const group = getGroupById(params.id);
  if (!group) return json({ error: 'Not found' }, { status: 404 });

  // Verify membership
  const members = getGroupMembers(params.id);
  if (!members.some((m: any) => m.account_id === locals.user!.id)) {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  const { name, emoji, memberIds } = await request.json();
  if (!name) return json({ error: 'Name required' }, { status: 400 });
  updateGroup(params.id, name, emoji, memberIds);
  return json({ ok: true });
};

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getGroupMembers } from '$lib/server/db/queries';

export const GET: RequestHandler = async ({ params, locals }) => {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const members = getGroupMembers(params.id);
  return json(members);
};

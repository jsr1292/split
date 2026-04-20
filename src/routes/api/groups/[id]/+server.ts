import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { updateGroup } from '$lib/server/db/queries';

export const PUT: RequestHandler = async ({ params, request }) => {
  const { name, emoji, memberIds } = await request.json();
  if (!name) return json({ error: 'Name required' }, { status: 400 });
  updateGroup(params.id, name, emoji, memberIds);
  return json({ ok: true });
};

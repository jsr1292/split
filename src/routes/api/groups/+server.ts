import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createGroup } from '$lib/server/db/queries';

export const POST: RequestHandler = async ({ request }) => {
  const { name, emoji, memberIds } = await request.json();
  if (!name || !memberIds?.length) {
    return json({ error: 'Name and members required' }, { status: 400 });
  }
  const group = createGroup(name, emoji || '🏠', memberIds);
  return json(group);
};

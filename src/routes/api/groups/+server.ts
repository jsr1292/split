import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createGroup } from '$lib/server/db/queries';

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

  const { name, emoji, memberIds, defaultCurrency } = await request.json();
  if (!name || !memberIds?.length) {
    return json({ error: 'Name and members required' }, { status: 400 });
  }
  const group = createGroup(name, emoji || '🏠', memberIds, defaultCurrency);
  return json(group);
};

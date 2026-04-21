import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createUser } from '$lib/server/db/queries';

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

  const { name } = await request.json();
  if (!name) return json({ error: 'Name required' }, { status: 400 });
  const user = createUser(name);
  return json(user);
};

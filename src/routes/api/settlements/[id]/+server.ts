import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { deleteSettlement } from '$lib/server/db/queries';

export const DELETE: RequestHandler = async ({ params, locals }) => {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  deleteSettlement(params.id);
  return json({ ok: true });
};

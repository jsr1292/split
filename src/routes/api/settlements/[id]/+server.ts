import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { deleteSettlement } from '$lib/server/db/queries';

export const DELETE: RequestHandler = async ({ params }) => {
  deleteSettlement(params.id);
  return json({ ok: true });
};

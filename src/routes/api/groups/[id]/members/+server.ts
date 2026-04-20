import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getGroupMembers } from '$lib/server/db/queries';

export const GET: RequestHandler = async ({ params }) => {
  const members = getGroupMembers(params.id);
  return json(members);
};

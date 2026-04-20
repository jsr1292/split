import { getGroupById, getGroupMembers, getAllUsers } from '$lib/server/db/queries';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const group = getGroupById(params.id);
  if (!group) throw error(404, 'Group not found');
  const members = getGroupMembers(params.id);
  const allUsers = getAllUsers();
  return { group, members, allUsers, memberIds: members.map((m: any) => m.id) };
};

import { getGroupById, getGroupMembers, getUsersInSharedGroups, getSelfUser, isGroupMember } from '$lib/server/db/queries';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
  const self = getSelfUser(locals.user?.id) as any;
  const group = getGroupById(params.id);
  if (!group) throw error(404, 'Group not found');

  // Only members can edit
  if (self && !isGroupMember(params.id, self.id)) {
    throw error(403, 'Not authorized');
  }

  const members = getGroupMembers(params.id);
  // Only show people the user shares any group with (not all users in the DB)
  const allUsers = self ? getUsersInSharedGroups(self.id) : members;
  return { group, members, allUsers, memberIds: members.map((m: any) => m.id) };
};

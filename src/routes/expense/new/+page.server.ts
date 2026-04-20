import type { PageServerLoad } from './$types';
import { getAllGroups, getGroupMembers, getSelfUser } from '$lib/server/db/queries';

export const load: PageServerLoad = async ({ url }) => {
  const self = getSelfUser() as any;
  const groupId = url.searchParams.get('group');
  const groups = getAllGroups();

  let members: any[] = [];
  if (groupId) {
    members = getGroupMembers(groupId);
  }

  return { self, groups, preselectedGroup: groupId, members };
};

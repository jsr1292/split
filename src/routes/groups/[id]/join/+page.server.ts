import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { getGroupById, getGroupMembers, getDb } from '$lib/server/db/queries';
import { getSelfUser } from '$lib/server/db/queries';

export const load: PageServerLoad = async ({ params, locals }) => {
  const group = getGroupById(params.id);
  if (!group) throw redirect(302, '/groups');

  if (!locals.user || !locals.userId) {
    throw redirect(302, '/auth/login');
  }

  // Check if already a member
  const members = getGroupMembers(params.id);
  const isMember = members.some((m: any) => m.id === locals.userId);

  if (isMember) {
    throw redirect(302, `/groups/${params.id}`);
  }

  // Get ghost users in this group (users without accounts)
  const ghostUsers = members.filter((m: any) => !m.account_id);

  return {
    group,
    ghostUsers: ghostUsers.length > 0 ? ghostUsers : null
  };
};

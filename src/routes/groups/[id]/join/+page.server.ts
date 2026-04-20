import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { getGroupById, getGroupMembers, getDb } from '$lib/server/db/queries';
import { v4 as uuid } from 'uuid';

export const load: PageServerLoad = async ({ params, locals }) => {
  const group = getGroupById(params.id);
  if (!group) throw redirect(302, '/groups');

  if (!locals.user || !locals.userId) {
    throw redirect(302, '/auth/login');
  }

  // Check if already a member
  const members = getGroupMembers(params.id);
  const isMember = members.some((m: any) => m.id === locals.userId);

  if (!isMember) {
    const db = getDb();
    db.prepare('INSERT OR IGNORE INTO group_members (group_id, user_id) VALUES (?, ?)')
      .run(params.id, locals.userId);
  }

  throw redirect(302, `/groups/${params.id}`);
};

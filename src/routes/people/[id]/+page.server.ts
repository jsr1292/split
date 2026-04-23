import { getUserById, getGroupsForUser, getGroupBalances, getSelfUser, getSharedExpenses, getDb } from '$lib/server/db/queries';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
  const self = getSelfUser(locals.user?.id) as any;
  if (!self) throw error(401, 'Not authenticated');

  const person = getUserById(params.id);
  if (!person) throw error(404, 'Person not found');

  // Get only groups the current user is in
  const groups = getGroupsForUser(self.id);
  const groupIds = groups.map((g: any) => g.id);

  // Find which of those groups the requested person is also in
  let actualSharedGroups: any[] = [];
  if (groupIds.length > 0) {
    const placeholders = groupIds.map(() => '?').join(',');
    const personMemberships = getDb().prepare(`
      SELECT group_id FROM group_members WHERE user_id = ? AND group_id IN (${placeholders})
    `).all(params.id, ...groupIds) as any[];
    const sharedGroupIds = new Set(personMemberships.map((m: any) => m.group_id));
    actualSharedGroups = groups.filter((g: any) => sharedGroupIds.has(g.id));
  }

  // If no shared groups, person has nothing to do with this user
  if (actualSharedGroups.length === 0 && person.id !== self.id) {
    throw error(403, 'You do not share any groups with this person');
  }

  // For each shared group, get balance
  const groupBalances = actualSharedGroups.map((g: any) => {
    const balances = getGroupBalances(g.id);
    let owed = 0;
    for (const b of balances) {
      if (b.from_user === self.id && b.to_user === params.id) owed -= b.amount;
      if (b.from_user === params.id && b.to_user === self.id) owed += b.amount;
    }
    return { ...g, balance: Math.round(owed * 100) / 100 };
  });

  const totalBalance = Math.round(groupBalances.reduce((sum: number, g: any) => sum + g.balance, 0) * 100) / 100;

  const sharedExpenses = getSharedExpenses(self.id, params.id);

  return { person, self, groupBalances, totalBalance, sharedExpenses };
};

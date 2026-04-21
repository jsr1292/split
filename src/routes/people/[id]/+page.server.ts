import { getUserById, getAllGroups, getGroupBalances, getSelfUser, getSharedExpenses, getDb } from '$lib/server/db/queries';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const person = getUserById(params.id);
  if (!person) throw error(404, 'Person not found');
  const self = getSelfUser() as any;
  const groups = getAllGroups();

  // Batch-fetch all group members in one query
  const allGroupIds = groups.map((g: any) => g.id);
  const membersByGroup: Record<string, string[]> = {};
  if (allGroupIds.length > 0) {
    const allMembers = getDb().prepare(`
      SELECT gm.group_id, gm.user_id FROM group_members gm WHERE gm.group_id IN (${allGroupIds.map(() => '?').join(',')})
    `).all(...allGroupIds) as any[];
    for (const m of allMembers) {
      if (!membersByGroup[m.group_id]) membersByGroup[m.group_id] = [];
      membersByGroup[m.group_id].push(m.user_id);
    }
  }

  // Find groups shared with this person (using the batch-fetched data)
  const sharedGroups = groups.filter((g: any) => {
    const memberIds = membersByGroup[g.id] || [];
    return memberIds.includes(params.id);
  });

  // For each shared group, get balance
  const groupBalances = sharedGroups.map((g: any) => {
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

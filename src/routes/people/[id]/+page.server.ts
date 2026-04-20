import { getUserById, getAllGroups, getGroupBalances, getSelfUser, getGroupMembers } from '$lib/server/db/queries';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const person = getUserById(params.id);
  if (!person) throw error(404, 'Person not found');
  const self = getSelfUser();
  const groups = getAllGroups();

  // Find groups shared with this person
  const sharedGroups = groups.filter((g: any) => {
    const members = getGroupMembers(g.id);
    return members.some((m: any) => m.id === params.id);
  });

  // For each shared group, get balance
  const groupBalances = sharedGroups.map((g: any) => {
    const balances = getGroupBalances(g.id);
    // Find balance between self and this person
    let owed = 0;
    for (const b of balances) {
      if (b.from_user === self.id && b.to_user === params.id) owed -= b.amount;
      if (b.from_user === params.id && b.to_user === self.id) owed += b.amount;
    }
    return { ...g, balance: Math.round(owed * 100) / 100 };
  });

  const totalBalance = Math.round(groupBalances.reduce((sum: number, g: any) => sum + g.balance, 0) * 100) / 100;

  return { person, self, groupBalances, totalBalance };
};

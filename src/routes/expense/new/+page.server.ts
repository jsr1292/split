import type { PageServerLoad } from './$types';
import { getAllGroups, getGroupMembers, getSelfUser } from '$lib/server/db/queries';
import { getSupportedCurrencies } from '$lib/server/currency';

export const load: PageServerLoad = async ({ url }) => {
  const self = getSelfUser(locals.user?.id) as any;
  const groupId = url.searchParams.get('group');
  const groups = getAllGroups();

  let members: any[] = [];
  if (groupId) {
    members = getGroupMembers(groupId);
  }

  const currencies = getSupportedCurrencies();
  const userBaseCurrency = self?.base_currency || 'EUR';

  return { self, groups, preselectedGroup: groupId, members, currencies, userBaseCurrency };
};

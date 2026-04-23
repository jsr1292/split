import type { PageServerLoad } from './$types';
import { getGroupsForUser, getGroupMembers, getSelfUser } from '$lib/server/db/queries';
import { getSupportedCurrencies } from '$lib/server/currency';

export const load: PageServerLoad = async ({ url, locals }) => {
  const self = getSelfUser(locals.user?.id) as any;
  if (!self) return { self: null, groups: [], preselectedGroup: null, members: [], currencies: [], userBaseCurrency: 'EUR' };

  const groupId = url.searchParams.get('group');
  const groups = getGroupsForUser(self.id);

  let members: any[] = [];
  if (groupId) {
    // Verify user is member of this group before showing members
    const { isGroupMember } = await import('$lib/server/db/queries');
    if (isGroupMember(groupId, self.id)) {
      members = getGroupMembers(groupId);
    }
  }

  const currencies = getSupportedCurrencies();
  const userBaseCurrency = self?.base_currency || 'EUR';

  return { self, groups, preselectedGroup: groupId, members, currencies, userBaseCurrency };
};

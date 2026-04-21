import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
  const res = await fetch('/api/sync/check');
  const data = res.ok ? await res.json() : { groups: [], totals: { expenses: 0, groups: 0, people: 0, settlements: 0 } };
  return { syncData: data };
};

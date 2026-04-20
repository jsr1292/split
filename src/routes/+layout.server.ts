import type { LayoutLoad } from './$types';
import { seedDemoData, getSelfUser } from '$lib/server/db/queries';

export const load: LayoutLoad = async () => {
  seedDemoData();
  const user = getSelfUser() as any;
  return { user };
};

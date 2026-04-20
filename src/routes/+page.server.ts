import { getDashboard, getSelfUser, getDb } from '$lib/server/db/queries';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const self = getSelfUser();
  if (!self) return { self: null, dashboard: null, categories: [] };

  const dashboard = getDashboard(self.id);

  // Category totals
  const categories = getDb().prepare(`
    SELECT e.category, SUM(e.amount) as total, COUNT(*) as count
    FROM expenses e
    JOIN group_members gm ON e.group_id = gm.group_id
    WHERE gm.user_id = ?
    GROUP BY e.category
    ORDER BY total DESC
  `).all(self.id);

  return { self, dashboard, categories };
};

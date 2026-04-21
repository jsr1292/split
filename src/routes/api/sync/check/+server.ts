import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db/queries';

export const GET: RequestHandler = async () => {
  const db = getDb();

  const groups = db.prepare(`
    SELECT
      g.id as groupId,
      g.name,
      COUNT(DISTINCT e.id) as expenseCount,
      COUNT(DISTINCT gm.user_id) as memberCount,
      COUNT(DISTINCT s.id) as settlementCount
    FROM groups g
    LEFT JOIN expenses e ON g.id = e.group_id
    LEFT JOIN group_members gm ON g.id = gm.group_id
    LEFT JOIN settlements s ON g.id = s.group_id
    GROUP BY g.id
  `).all();

  const totals = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM expenses) as expenses,
      (SELECT COUNT(*) FROM groups) as groups,
      (SELECT COUNT(*) FROM users) as people,
      (SELECT COUNT(*) FROM settlements) as settlements
  `).get();

  return json({ groups, totals });
};

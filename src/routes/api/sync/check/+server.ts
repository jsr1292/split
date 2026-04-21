import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db/queries';

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();

  const groups = db.prepare(`
    SELECT
      g.id as groupId,
      g.name,
      COUNT(DISTINCT e.id) as expenseCount,
      COUNT(DISTINCT gm.user_id) as memberCount,
      COUNT(DISTINCT s.id) as settlementCount
    FROM groups g
    LEFT JOIN group_members gm ON g.id = gm.group_id
    LEFT JOIN expenses e ON g.id = e.group_id
    LEFT JOIN settlements s ON g.id = s.group_id
    GROUP BY g.id
    ORDER BY g.created_at DESC
  `).all();

  const people = db.prepare('SELECT COUNT(*) as count FROM users').get() as any;
  const expenses = db.prepare('SELECT COUNT(*) as count FROM expenses').get() as any;
  const settlements = db.prepare('SELECT COUNT(*) as count FROM settlements').get() as any;

  return json({
    groups,
    totals: {
      people: people.count,
      expenses: expenses.count,
      settlements: settlements.count
    }
  });
};

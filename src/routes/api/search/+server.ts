import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb, getSelfUser } from '$lib/server/db/queries';

export const GET: RequestHandler = async ({ url, locals }) => {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const self = getSelfUser(locals.user.id) as any;
  if (!self) return json([]);

  const q = url.searchParams.get('q') || '';
  if (!q || q.length < 2) return json([]);

  // Only search expenses in groups the user is a member of
  const results = getDb().prepare(`
    SELECT e.*, g.name as group_name, g.emoji as group_emoji, u.name as paid_by_name
    FROM expenses e
    JOIN groups g ON e.group_id = g.id
    JOIN users u ON e.paid_by = u.id
    JOIN group_members gm ON e.group_id = gm.group_id AND gm.user_id = ?
    WHERE e.description LIKE ?
    ORDER BY e.date DESC
    LIMIT 20
  `).all(self.id, `%${q}%`);

  return json(results);
};

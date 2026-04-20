import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db/queries';

export const GET: RequestHandler = async ({ url }) => {
  const q = url.searchParams.get('q') || '';
  if (!q || q.length < 2) return json([]);

  const results = getDb().prepare(`
    SELECT e.*, g.name as group_name, g.emoji as group_emoji, u.name as paid_by_name
    FROM expenses e
    JOIN groups g ON e.group_id = g.id
    JOIN users u ON e.paid_by = u.id
    WHERE e.description LIKE ?
    ORDER BY e.date DESC
    LIMIT 20
  `).all(`%${q}%`);

  return json(results);
};

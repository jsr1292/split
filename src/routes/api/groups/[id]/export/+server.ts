import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getGroupById, getExpensesByGroup, getExpenseSplits, getGroupMembers } from '$lib/server/db/queries';

export const GET: RequestHandler = async ({ params, locals }) => {
  if (!locals.user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const group = getGroupById(params.id);
  if (!group) {
    return json({ error: 'Group not found' }, { status: 404 });
  }

  const expenses = getExpensesByGroup(params.id);
  const members = getGroupMembers(params.id);
  const memberMap: Record<string, string> = {};
  for (const m of members) {
    memberMap[m.id] = m.name;
  }

  // Build CSV
  const lines: string[] = [];
  lines.push('Fecha,Descripción,Categoría,Pagado por,Monto,Cantidad splits,Splits');

  for (const exp of expenses) {
    const splits = getExpenseSplits(exp.id);
    const splitNames = splits.map((s: any) => `${memberMap[s.user_id] || s.user_id}:${s.share.toFixed(2)}`).join('; ');
    const row = [
      exp.date,
      `"${exp.description.replace(/"/g, '""')}"`,
      exp.category,
      memberMap[exp.paid_by] || exp.paid_by,
      exp.amount.toFixed(2),
      splits.length,
      `"${splitNames}"`
    ];
    lines.push(row.join(','));
  }

  const csv = lines.join('\n');
  const filename = `${group.name.replace(/[^a-z0-9]/gi, '_')}_gastos.csv`;

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`
    }
  });
};

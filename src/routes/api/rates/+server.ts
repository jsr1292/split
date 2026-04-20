import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getTodayRate, convert } from '$lib/server/currency';

export const GET: RequestHandler = async ({ url }) => {
  const from = url.searchParams.get('from') || 'EUR';
  const to = url.searchParams.get('to') || 'EUR';
  const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];

  // If date is today or not provided, use today's rate for preview
  if (date === new Date().toISOString().split('T')[0]) {
    const rate = await getTodayRate(from, to);
    return json({ from, to, date, rate, converted: null });
  }

  // For historical dates, use convert which will fetch/cache the rate
  const { converted, rate } = await convert(1, from, to, date);
  return json({ from, to, date, rate, converted });
};

export const POST: RequestHandler = async ({ request }) => {
  const { amount, from, to, date } = await request.json();

  if (!amount || !from || !to) {
    return json({ error: 'Missing required fields' }, { status: 400 });
  }

  const targetDate = date || new Date().toISOString().split('T')[0];
  const { converted, rate } = await convert(parseFloat(amount), from, to, targetDate);

  return json({ from, to, date: targetDate, originalAmount: amount, convertedAmount: converted, rate });
};

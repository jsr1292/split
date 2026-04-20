import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSupportedCurrencies } from '$lib/server/currency';

export const GET: RequestHandler = async () => {
  const currencies = getSupportedCurrencies();
  return json(currencies);
};

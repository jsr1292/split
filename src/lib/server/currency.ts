import { getDb } from './db/index';

export const SUPPORTED_CURRENCIES = [
  'EUR', 'GBP', 'USD', 'CHF', 'JPY', 'CAD', 'AUD', 'NZD',
  'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'RON', 'BGN',
  'HRK', 'TRY', 'BRL', 'MXN', 'CNY', 'INR', 'KRW', 'THB',
  'SGD', 'HKD', 'ZAR', 'AED', 'ILS', 'PHP', 'TWD', 'MYR', 'IDR'
];

export function getSupportedCurrencies() {
  return SUPPORTED_CURRENCIES;
}

/**
 * Get exchange rate between two currencies for a specific date.
 * Rates are fetched from ECB and cached in the exchange_rates table.
 * To convert between non-EUR currencies, we go through EUR.
 * If rate not available for date, uses most recent prior rate.
 */
export async function fetchRate(date: string, fromCurrency: string, toCurrency: string): Promise<number> {
  if (fromCurrency === toCurrency) return 1.0;

  const db = getDb();

  // Check cache first
  const cached = db.prepare(
    'SELECT rate FROM exchange_rates WHERE date = ? AND from_currency = ? AND to_currency = ?'
  ).get(date, fromCurrency, toCurrency) as { rate: number } | undefined;

  if (cached) return cached.rate;

  // Try Frankfurter (free, no key required)
  // Supports: EUR, AUD, BRL, CAD, CHF, CNY, CZK, DKK, GBP, HKD, HUF, IDR, ILS, INR, JPY, KRW, MXN, MYR, NOK, NZD, PHP, PLN, RON, SEK, SGD, THB, TRY, USD, ZAR
  try {
    const symbols = SUPPORTED_CURRENCIES.filter(c => c !== 'EUR').join(',');
    // Try historical first, fall back to latest
    let url = `https://api.frankfurter.app/${date}?from=EUR&to=${symbols}`;
    let res = await fetch(url);
    let data = await res.json();

    // If date not supported (future), use latest
    if (data.error || !data.rates) {
      url = `https://api.frankfurter.app/latest?from=EUR&to=${symbols}`;
      res = await fetch(url);
      data = await res.json();
    }

    if (!data.rates) throw new Error('No rates from Frankfurter');

    const rates = data.rates as Record<string, number>;

    // Cache all fetched rates for this date
    const insert = db.prepare(
      'INSERT OR REPLACE INTO exchange_rates (date, from_currency, to_currency, rate, source) VALUES (?, ?, ?, ?, ?)'
    );

    for (const [currency, rate] of Object.entries(rates)) {
      insert.run(date, 'EUR', currency, rate, 'frankfurter');
      insert.run(date, currency, 'EUR', 1 / rate, 'frankfurter');
    }
    insert.run(date, 'EUR', 'EUR', 1.0, 'frankfurter');

    // EUR to EUR = 1
    const eurTo = rates[toCurrency];
    const eurFrom = rates[fromCurrency];

    if (fromCurrency === 'EUR') {
      return eurTo || 1.0;
    } else if (toCurrency === 'EUR') {
      return eurFrom ? 1 / eurFrom : 1.0;
    } else {
      // Cross through EUR: from→EUR→to
      if (!eurFrom || !eurTo) return 1.0;
      return (1 / eurFrom) * eurTo;
    }
  } catch (err) {
    console.error('Failed to fetch from Frankfurter:', err);

    // Fallback: try to find most recent prior rate
    const fallback = db.prepare(`
      SELECT rate, date FROM exchange_rates
      WHERE date <= ? AND from_currency = ? AND to_currency = ?
      ORDER BY date DESC LIMIT 1
    `).get(date, fromCurrency, toCurrency) as { rate: number; date: string } | undefined;

    if (fallback) {
      return fallback.rate;
    }

    return 1.0;
  }
}

/**
 * Convert an amount from one currency to another at a specific date's rate.
 */
export async function convert(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  date: string
): Promise<{ converted: number; rate: number }> {
  if (fromCurrency === toCurrency) {
    return { converted: amount, rate: 1.0 };
  }

  const rate = await fetchRate(date, fromCurrency, toCurrency);
  return {
    converted: Math.round(amount * rate * 100) / 100,
    rate
  };
}

/**
 * Get rate for display (synchronous - uses cached rate or returns 1.0).
 * For real conversion use convert().
 */
export function getCachedRate(date: string, fromCurrency: string, toCurrency: string): number {
  if (fromCurrency === toCurrency) return 1.0;

  const db = getDb();
  const cached = db.prepare(
    'SELECT rate FROM exchange_rates WHERE date = ? AND from_currency = ? AND to_currency = ?'
  ).get(date, fromCurrency, toCurrency) as { rate: number } | undefined;

  if (cached) return cached.rate;

  // Try any date (most recent)
  const anyDate = db.prepare(`
    SELECT rate, date FROM exchange_rates
    WHERE from_currency = ? AND to_currency = ?
    ORDER BY date DESC LIMIT 1
  `).get(fromCurrency, toCurrency) as { rate: number; date: string } | undefined;

  return anyDate?.rate || 1.0;
}

/**
 * Get today's rate for quick conversion preview (doesn't require date).
 */
export async function getTodayRate(fromCurrency: string, toCurrency: string): Promise<number> {
  if (fromCurrency === toCurrency) return 1.0;

  const today = new Date().toISOString().split('T')[0];

  const db = getDb();
  const cached = db.prepare(
    'SELECT rate FROM exchange_rates WHERE date = ? AND from_currency = ? AND to_currency = ?'
  ).get(today, fromCurrency, toCurrency) as { rate: number } | undefined;

  if (cached) return cached.rate;

  try {
    const symbols = SUPPORTED_CURRENCIES.filter(c => c !== 'EUR').join(',');
    const url = `https://api.frankfurter.app/latest?from=EUR&to=${symbols}`;
    const res = await fetch(url);

    if (!res.ok) throw new Error(`Frankfurter error: ${res.status}`);

    const data = await res.json();
    const rates = data.rates as Record<string, number>;

    const insert = db.prepare(
      'INSERT OR REPLACE INTO exchange_rates (date, from_currency, to_currency, rate, source) VALUES (?, ?, ?, ?, ?)'
    );

    for (const [currency, rate] of Object.entries(rates)) {
      insert.run(today, 'EUR', currency, rate, 'frankfurter');
      insert.run(today, currency, 'EUR', 1 / rate, 'frankfurter');
    }
    insert.run(today, 'EUR', 'EUR', 1.0, 'frankfurter');

    const eurTo = rates[toCurrency];
    const eurFrom = rates[fromCurrency];

    if (fromCurrency === 'EUR') {
      return eurTo || 1.0;
    } else if (toCurrency === 'EUR') {
      return eurFrom ? 1 / eurFrom : 1.0;
    } else {
      if (!eurFrom || !eurTo) return 1.0;
      return (1 / eurFrom) * eurTo;
    }
  } catch (err) {
    console.error('Failed to fetch today rate:', err);
    return 1.0;
  }
}

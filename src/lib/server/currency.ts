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

// ── Internal helpers ──────────────────────────────────────────

async function fetchFromFrankfurter(date: string): Promise<Record<string, number> | null> {
  const symbols = SUPPORTED_CURRENCIES.filter(c => c !== 'EUR').join(',');
  const url = `https://api.frankfurter.app/${date}?from=EUR&to=${symbols}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  return data.rates || null;
}

async function fetchLatestFromFrankfurter(): Promise<Record<string, number> | null> {
  const symbols = SUPPORTED_CURRENCIES.filter(c => c !== 'EUR').join(',');
  const url = `https://api.frankfurter.app/latest?from=EUR&to=${symbols}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  return data.rates || null;
}

async function fetchLatestFromOpenER(): Promise<Record<string, number> | null> {
  // Free, no key, supports EUR, USD, GBP, etc.
  const url = 'https://open.er-api.com/v6/latest/EUR';
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.rates) return null;
  // open.er-api returns EUR-based rates keyed by currency code
  return data.rates as Record<string, number>;
}

function cacheRates(date: string, rates: Record<string, number>, source: string) {
  const db = getDb();
  const insert = db.prepare(
    'INSERT OR REPLACE INTO exchange_rates (date, from_currency, to_currency, rate, source) VALUES (?, ?, ?, ?, ?)'
  );
  for (const [currency, rate] of Object.entries(rates)) {
    insert.run(date, 'EUR', currency, rate, source);
    insert.run(date, currency, 'EUR', 1 / rate, source);
  }
  insert.run(date, 'EUR', 'EUR', 1.0, source);
}

function dbFallback(date: string, fromCurrency: string, toCurrency: string): number {
  const db = getDb();
  const fallback = db.prepare(`
    SELECT rate FROM exchange_rates
    WHERE date <= ? AND from_currency = ? AND to_currency = ?
    ORDER BY date DESC LIMIT 1
  `).get(date, fromCurrency, toCurrency) as { rate: number } | undefined;
  return fallback?.rate || 1.0;
}

// ── Public API ────────────────────────────────────────────────

/**
 * Get exchange rate between two currencies for a specific date.
 * Chain: Frankfurter (historical) → DB cached → 1.0
 * To convert between non-EUR currencies, we go through EUR.
 */
export async function fetchRate(date: string, fromCurrency: string, toCurrency: string): Promise<number> {
  if (fromCurrency === toCurrency) return 1.0;

  // 1. Check cache
  const db = getDb();
  const cached = db.prepare(
    'SELECT rate FROM exchange_rates WHERE date = ? AND from_currency = ? AND to_currency = ?'
  ).get(date, fromCurrency, toCurrency) as { rate: number } | undefined;
  if (cached) return cached.rate;

  // 2. Fetch from Frankfurter (supports historical dates)
  const rates = await fetchFromFrankfurter(date);
  if (rates) {
    cacheRates(date, rates, 'frankfurter');
    return computeRate(fromCurrency, toCurrency, rates);
  }

  // 3. DB fallback
  const fallback = dbFallback(date, fromCurrency, toCurrency);
  return fallback;
}

/**
 * Get today's rate for quick conversion preview.
 * Chain: Frankfurter → open.er-api.com → DB → 1.0
 */
export async function getTodayRate(fromCurrency: string, toCurrency: string): Promise<number> {
  if (fromCurrency === toCurrency) return 1.0;

  const today = new Date().toISOString().split('T')[0];

  // 1. Check cache
  const db = getDb();
  const cached = db.prepare(
    'SELECT rate FROM exchange_rates WHERE date = ? AND from_currency = ? AND to_currency = ?'
  ).get(today, fromCurrency, toCurrency) as { rate: number } | undefined;
  if (cached) return cached.rate;

  // 2. Try Frankfurter
  const frankRates = await fetchLatestFromFrankfurter();
  if (frankRates) {
    cacheRates(today, frankRates, 'frankfurter');
    return computeRate(fromCurrency, toCurrency, frankRates);
  }

  // 3. Try open.er-api.com as fallback (no historical support, latest only)
  const openRates = await fetchLatestFromOpenER();
  if (openRates) {
    cacheRates(today, openRates, 'open-er-api');
    return computeRate(fromCurrency, toCurrency, openRates);
  }

  // 4. DB fallback
  return dbFallback(today, fromCurrency, toCurrency);
}

function computeRate(from: string, to: string, rates: Record<string, number>): number {
  const eurTo = rates[to];
  const eurFrom = rates[from];
  if (from === 'EUR') return eurTo || 1.0;
  if (to === 'EUR') return eurFrom ? 1 / eurFrom : 1.0;
  if (!eurFrom || !eurTo) return 1.0;
  return (1 / eurFrom) * eurTo;
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
 * Get rate for display (synchronous — uses cached rate or returns 1.0).
 * For real conversion use convert().
 */
export function getCachedRate(date: string, fromCurrency: string, toCurrency: string): number {
  if (fromCurrency === toCurrency) return 1.0;
  const db = getDb();
  const cached = db.prepare(
    'SELECT rate FROM exchange_rates WHERE date = ? AND from_currency = ? AND to_currency = ?'
  ).get(date, fromCurrency, toCurrency) as { rate: number } | undefined;
  if (cached) return cached.rate;
  return dbFallback(date, fromCurrency, toCurrency);
}

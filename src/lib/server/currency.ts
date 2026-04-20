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

  // Try to get from ECB API
  try {
    // ECB gives EUR-based rates
    const dateStr = date; // YYYY-MM-DD
    const symbols = SUPPORTED_CURRENCIES.filter(c => c !== 'EUR').join(',');
    const url = `https://api.exchangerate.host/${dateStr}?base=EUR&symbols=${symbols}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`ECB API error: ${res.status}`);

    const data = await res.json();
    if (!data.success && !data.rates) throw new Error('Invalid ECB response');

    const rates = data.rates as Record<string, number>;

    // Cache all fetched rates for this date
    const insert = db.prepare(
      'INSERT OR REPLACE INTO exchange_rates (date, from_currency, to_currency, rate, source) VALUES (?, ?, ?, ?, ?)'
    );

    for (const [currency, rate] of Object.entries(rates)) {
      // EUR to currency
      insert.run(dateStr, 'EUR', currency, rate, 'ecb');
      // currency to EUR (inverse)
      insert.run(dateStr, currency, 'EUR', 1 / rate, 'ecb');
    }
    // EUR to EUR = 1
    insert.run(dateStr, 'EUR', 'EUR', 1.0, 'ecb');

    // Now get the specific rate we need
    if (fromCurrency === 'EUR') {
      return rates[toCurrency] || 1.0;
    } else if (toCurrency === 'EUR') {
      return 1 / (rates[fromCurrency] || 1.0);
    } else {
      // Cross through EUR
      const fromToEur = 1 / (rates[fromCurrency] || 1.0);
      const eurToTarget = rates[toCurrency] || 1.0;
      return fromToEur * eurToTarget;
    }
  } catch (err) {
    console.error('Failed to fetch from ECB, trying fallback:', err);

    // Fallback: try to find most recent prior rate
    const fallback = db.prepare(`
      SELECT rate FROM exchange_rates
      WHERE date < ? AND from_currency = ? AND to_currency = ?
      ORDER BY date DESC LIMIT 1
    `).get(date, fromCurrency, toCurrency) as { rate: number } | undefined;

    if (fallback) {
      console.log(`Using fallback rate from prior date for ${fromCurrency}/${toCurrency}`);
      return fallback.rate;
    }

    // Last resort: return 1 (no conversion)
    console.error(`No rate found for ${fromCurrency}/${toCurrency} on ${date}, defaulting to 1.0`);
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

  // Check if we have today's rate cached
  const db = getDb();
  const cached = db.prepare(
    'SELECT rate FROM exchange_rates WHERE date = ? AND from_currency = ? AND to_currency = ?'
  ).get(today, fromCurrency, toCurrency) as { rate: number } | undefined;

  if (cached) return cached.rate;

  // Try to fetch today's rate
  try {
    const symbols = SUPPORTED_CURRENCIES.filter(c => c !== 'EUR').join(',');
    const url = `https://api.exchangerate.host/latest?base=EUR&symbols=${symbols}`;
    const res = await fetch(url);

    if (!res.ok) throw new Error(`ECB API error: ${res.status}`);

    const data = await res.json();
    const rates = data.rates as Record<string, number>;

    const insert = db.prepare(
      'INSERT OR REPLACE INTO exchange_rates (date, from_currency, to_currency, rate, source) VALUES (?, ?, ?, ?, ?)'
    );

    for (const [currency, rate] of Object.entries(rates)) {
      insert.run(today, 'EUR', currency, rate, 'ecb');
      insert.run(today, currency, 'EUR', 1 / rate, 'ecb');
    }
    insert.run(today, 'EUR', 'EUR', 1.0, 'ecb');

    if (fromCurrency === 'EUR') {
      return rates[toCurrency] || 1.0;
    } else if (toCurrency === 'EUR') {
      return 1 / (rates[fromCurrency] || 1.0);
    } else {
      const fromToEur = 1 / (rates[fromCurrency] || 1.0);
      const eurToTarget = rates[toCurrency] || 1.0;
      return fromToEur * eurToTarget;
    }
  } catch (err) {
    console.error('Failed to fetch today rate:', err);
    return 1.0;
  }
}

// Migration script to add multi-currency columns
// Run with: node migrate-currency.js

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'data', 'splitwise.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

console.log('Running multi-currency migration...');

// 1. Add base_currency to users
try {
  db.exec("ALTER TABLE users ADD COLUMN base_currency TEXT DEFAULT 'EUR'");
  console.log('✓ Added base_currency to users');
} catch (e) {
  if (e.message.includes('duplicate column')) {
    console.log('• base_currency already exists in users');
  } else {
    console.error('Error adding base_currency:', e.message);
  }
}

// 2. Add base_currency and base_amount to expense_splits
try {
  db.exec("ALTER TABLE expense_splits ADD COLUMN base_currency TEXT");
  console.log('✓ Added base_currency to expense_splits');
} catch (e) {
  if (e.message.includes('duplicate column')) {
    console.log('• base_currency already exists in expense_splits');
  } else {
    console.error('Error adding base_currency:', e.message);
  }
}

try {
  db.exec("ALTER TABLE expense_splits ADD COLUMN base_amount REAL");
  console.log('✓ Added base_amount to expense_splits');
} catch (e) {
  if (e.message.includes('duplicate column')) {
    console.log('• base_amount already exists in expense_splits');
  } else {
    console.error('Error adding base_amount:', e.message);
  }
}

// 3. Create exchange_rates table
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS exchange_rates (
      date TEXT NOT NULL,
      from_currency TEXT NOT NULL,
      to_currency TEXT NOT NULL,
      rate REAL NOT NULL,
      source TEXT DEFAULT 'ecb',
      PRIMARY KEY (date, from_currency, to_currency)
    )
  `);
  console.log('✓ Created exchange_rates table');
} catch (e) {
  console.error('Error creating exchange_rates:', e.message);
}

// 4. Rename groups.currency to groups.default_currency (keep data)
// Since we can't easily rename, we'll use groups.currency as default_currency
// Just make sure it exists and has a default

// 5. Update existing expense_splits with base_amount = share and base_currency = 'EUR'
// This is for backward compatibility - existing expenses are in EUR
try {
  const result = db.prepare(`
    UPDATE expense_splits
    SET base_amount = share, base_currency = 'EUR'
    WHERE base_amount IS NULL
  `).run();
  console.log(`✓ Updated ${result.changes} existing expense_splits with default base values`);
} catch (e) {
  console.error('Error updating expense_splits:', e.message);
}

// 6. Create index on exchange_rates
try {
  db.exec('CREATE INDEX IF NOT EXISTS idx_exchange_rates_date ON exchange_rates(date)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_exchange_rates_currencies ON exchange_rates(from_currency, to_currency)');
  console.log('✓ Created indexes on exchange_rates');
} catch (e) {
  console.error('Error creating indexes:', e.message);
}

console.log('\nMigration complete!');
console.log('\nVerifying schema...');
const usersCols = db.prepare('PRAGMA table_info(users)').all();
console.log('users columns:', usersCols.map(c => c.name));
const splitsCols = db.prepare('PRAGMA table_info(expense_splits)').all();
console.log('expense_splits columns:', splitsCols.map(c => c.name));
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', tables.map(t => t.name));

db.close();

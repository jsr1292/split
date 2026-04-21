import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', '..', '..', '..', 'data', 'splitwise.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    // Ensure data directory exists
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema(db);
  }
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      avatar_color TEXT DEFAULT '#c9a84c',
      is_self INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      emoji TEXT DEFAULT '🏠',
      currency TEXT DEFAULT 'EUR',
      currency_mode TEXT DEFAULT 'single',
      base_currency TEXT DEFAULT 'EUR',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS group_members (
      group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      joined_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (group_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'EUR',
      paid_by TEXT NOT NULL REFERENCES users(id),
      split_type TEXT DEFAULT 'equal',
      category TEXT DEFAULT 'other',
      date TEXT NOT NULL,
      note TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      created_by TEXT REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS expense_splits (
      id TEXT PRIMARY KEY,
      expense_id TEXT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      share REAL NOT NULL,
      UNIQUE(expense_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS settlements (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      from_user TEXT NOT NULL REFERENCES users(id),
      to_user TEXT NOT NULL REFERENCES users(id),
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS expense_items (
      id TEXT PRIMARY KEY,
      expense_id TEXT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      amount REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS expense_item_splits (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL REFERENCES expense_items(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      share REAL NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_expenses_group ON expenses(group_id);
    CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date DESC, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_expense_splits_expense ON expense_splits(expense_id);
    CREATE INDEX IF NOT EXISTS idx_expense_splits_user ON expense_splits(user_id);
    CREATE INDEX IF NOT EXISTS idx_expense_items_expense ON expense_items(expense_id);
    CREATE INDEX IF NOT EXISTS idx_expense_item_splits_item ON expense_item_splits(item_id);
    CREATE INDEX IF NOT EXISTS idx_settlements_group ON settlements(group_id);
    CREATE INDEX IF NOT EXISTS idx_settlements_from_user ON settlements(from_user);
    CREATE INDEX IF NOT EXISTS idx_settlements_to_user ON settlements(to_user);
    CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);
    CREATE INDEX IF NOT EXISTS idx_exchange_rates_lookup ON exchange_rates(from_currency, to_currency, date DESC);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_expenses_idempotency ON expenses(idempotency_key) WHERE idempotency_key IS NOT NULL;
  `);

  // Add idempotency_key column if it doesn't exist (for existing databases)
  try {
    db.exec(`ALTER TABLE expenses ADD COLUMN idempotency_key TEXT`);
  } catch (e: any) {
    if (!e.message.includes('duplicate column name')) {
      // Ignore if column already exists
    }
  }

  // Add currency_mode and base_currency to groups for existing databases
  try { db.exec(`ALTER TABLE groups ADD COLUMN currency_mode TEXT DEFAULT 'single'`); } catch {}
  try { db.exec(`ALTER TABLE groups ADD COLUMN base_currency TEXT DEFAULT 'EUR'`); } catch {}
}

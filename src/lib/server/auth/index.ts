import { getDb } from '../db/index';
import { v4 as uuid } from 'uuid';
import crypto from 'crypto';

// Simple password hashing (SHA-256 with salt — good enough for self-hosted)
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  const verify = crypto.scryptSync(password, salt, 64).toString('hex');
  return hash === verify;
}

export function createAccount(email: string, password: string, name: string) {
  const db = getDb();
  const id = uuid();
  const passwordHash = hashPassword(password);
  db.prepare('INSERT INTO accounts (id, email, password_hash, name) VALUES (?, ?, ?, ?)')
    .run(id, email.toLowerCase().trim(), passwordHash, name);

  // Create a corresponding user entry
  const colors = ['#c9a84c', '#3b82f6', '#a855f7', '#00e5a0', '#ff4d6a', '#f59e0b', '#06b6d4', '#ec4899'];
  const color = colors[Date.now() % colors.length];
  const isFirst = (db.prepare('SELECT COUNT(*) as c FROM accounts').get() as any).c === 1;
  db.prepare('INSERT INTO users (id, name, avatar_color, is_self, account_id) VALUES (?, ?, ?, ?, ?)')
    .run(id, name, color, isFirst ? 1 : 0, id);

  return { id, email, name };
}

export function authenticate(email: string, password: string) {
  const db = getDb();
  const account = db.prepare('SELECT * FROM accounts WHERE email = ?').get(email.toLowerCase().trim()) as any;
  if (!account) return null;
  if (!verifyPassword(password, account.password_hash)) return null;
  return { id: account.id, email: account.email, name: account.name };
}

export function createSession(accountId: string): string {
  const db = getDb();
  const id = uuid();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days
  db.prepare('INSERT INTO sessions (id, account_id, expires_at) VALUES (?, ?, ?)')
    .run(id, accountId, expiresAt);
  return id;
}

export function getSession(sessionId: string) {
  const db = getDb();
  const session = db.prepare(`
    SELECT s.*, a.email, a.name
    FROM sessions s
    JOIN accounts a ON s.account_id = a.id
    WHERE s.id = ? AND s.expires_at > datetime('now')
  `).get(sessionId) as any;
  return session || null;
}

export function deleteSession(sessionId: string) {
  getDb().prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
}

export function getAccountByUserId(userId: string) {
  return getDb().prepare('SELECT account_id FROM users WHERE id = ?').get(userId) as any;
}

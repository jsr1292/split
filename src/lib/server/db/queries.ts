import { getDb } from './index';
import { v4 as uuid } from 'uuid';

export { getDb };

// ── USERS ──

export function getAllUsers() {
  return getDb().prepare('SELECT * FROM users ORDER BY name').all();
}

export function getUserById(id: string) {
  return getDb().prepare('SELECT * FROM users WHERE id = ?').get(id);
}

export function getSelfUser(accountId?: string) {
  if (accountId) return getDb().prepare('SELECT * FROM users WHERE account_id = ?').get(accountId);
  return getDb().prepare('SELECT * FROM users WHERE is_self = 1').get();
}

export function createUser(name: string, isSelf = false, email?: string) {
  const colors = ['#c9a84c', '#3b82f6', '#a855f7', '#00e5a0', '#ff4d6a', '#f59e0b', '#06b6d4', '#ec4899'];
  const id = uuid();
  const color = colors[Date.now() % colors.length];
  getDb().prepare('INSERT INTO users (id, name, email, avatar_color, is_self) VALUES (?, ?, ?, ?, ?)')
    .run(id, name, email || null, color, isSelf ? 1 : 0);
  return getUserById(id);
}

// ── GROUPS ──

export function getAllGroups() {
  return getDb().prepare(`
    SELECT g.*, 
      COUNT(DISTINCT gm.user_id) as member_count,
      COUNT(DISTINCT e.id) as expense_count
    FROM groups g
    LEFT JOIN group_members gm ON g.id = gm.group_id
    LEFT JOIN expenses e ON g.id = e.group_id
    GROUP BY g.id
    ORDER BY g.created_at DESC
  `).all();
}

export function getGroupById(id: string) {
  return getDb().prepare('SELECT * FROM groups WHERE id = ?').get(id);
}

export function createGroup(name: string, emoji: string, memberIds: string[]) {
  const db = getDb();
  const id = uuid();
  const insert = db.transaction(() => {
    db.prepare('INSERT INTO groups (id, name, emoji) VALUES (?, ?, ?)').run(id, name, emoji);
    const insertMember = db.prepare('INSERT OR IGNORE INTO group_members (group_id, user_id) VALUES (?, ?)');
    for (const uid of memberIds) {
      insertMember.run(id, uid);
    }
  });
  insert();
  return getGroupById(id);
}

export function getGroupMembers(groupId: string) {
  return getDb().prepare(`
    SELECT u.* FROM users u
    JOIN group_members gm ON u.id = gm.user_id
    WHERE gm.group_id = ?
    ORDER BY u.name
  `).all(groupId);
}

// ── EXPENSES ──

export function getExpensesByGroup(groupId: string) {
  return getDb().prepare(`
    SELECT e.*, u.name as paid_by_name, u.avatar_color as paid_by_color
    FROM expenses e
    JOIN users u ON e.paid_by = u.id
    WHERE e.group_id = ?
    ORDER BY e.date DESC, e.created_at DESC
  `).all(groupId);
}

export function getExpenseById(id: string) {
  return getDb().prepare(`
    SELECT e.*, u.name as paid_by_name, u.avatar_color as paid_by_color
    FROM expenses e
    JOIN users u ON e.paid_by = u.id
    WHERE e.id = ?
  `).get(id);
}

export function getExpenseSplits(expenseId: string) {
  return getDb().prepare(`
    SELECT es.*, u.name as user_name, u.avatar_color as user_color
    FROM expense_splits es
    JOIN users u ON es.user_id = u.id
    WHERE es.expense_id = ?
  `).all(expenseId);
}

export function createExpense(
  groupId: string, description: string, amount: number, paidBy: string,
  splitType: string, category: string, date: string, splitUserIds: string[],
  exactShares?: Record<string, number>, createdBy?: string, note?: string
) {
  const db = getDb();
  const id = uuid();

  const insert = db.transaction(() => {
    db.prepare(`
      INSERT INTO expenses (id, group_id, description, amount, paid_by, split_type, category, date, note, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, groupId, description, amount, paidBy, splitType, category, date, note || null, createdBy || null);

    // Calculate shares
    const insertSplit = db.prepare('INSERT INTO expense_splits (id, expense_id, user_id, share) VALUES (?, ?, ?, ?)');
    const splitCount = splitUserIds.length;
    for (const uid of splitUserIds) {
      let share: number;
      if (splitType === 'exact' && exactShares && exactShares[uid] !== undefined) {
        share = exactShares[uid];
      } else {
        share = Math.round((amount / splitCount) * 100) / 100;
      }
      insertSplit.run(uuid(), id, uid, share);
    }
  });

  insert();
  return getExpenseById(id);
}

export function deleteExpense(id: string) {
  const db = getDb();
  db.prepare('DELETE FROM expense_splits WHERE expense_id = ?').run(id);
  db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
}

export function updateExpense(
  id: string, data: { description: string; amount: number; paidBy: string; category: string; date: string; note?: string; splitUserIds: string[] }
) {
  const db = getDb();
  db.transaction(() => {
    db.prepare(`
      UPDATE expenses SET description = ?, amount = ?, paid_by = ?, category = ?, date = ?, note = ?
      WHERE id = ?
    `).run(data.description, data.amount, data.paidBy, data.category, data.date, data.note || null, id);
    db.prepare('DELETE FROM expense_splits WHERE expense_id = ?').run(id);
    const insertSplit = db.prepare('INSERT INTO expense_splits (id, expense_id, user_id, share) VALUES (?, ?, ?, ?)');
    const splitCount = data.splitUserIds.length;
    for (const uid of data.splitUserIds) {
      const share = Math.round((data.amount / splitCount) * 100) / 100;
      insertSplit.run(uuid(), id, uid, share);
    }
  })();
  return getExpenseById(id);
}

// ── BALANCES ──

export interface Balance {
  from_user: string;
  from_name: string;
  to_user: string;
  to_name: string;
  amount: number;
}

export function getGroupBalances(groupId: string): Balance[] {
  const db = getDb();
  const expenses = db.prepare(`
    SELECT e.paid_by, es.user_id as debtor, es.share
    FROM expenses e
    JOIN expense_splits es ON e.id = es.expense_id
    WHERE e.group_id = ? AND es.user_id != e.paid_by
  `).all(groupId);

  const settlements = db.prepare(`
    SELECT from_user, to_user, amount
    FROM settlements
    WHERE group_id = ?
  `).all(groupId);

  // Net balances: positive = owed to person, negative = person owes
  const net: Record<string, Record<string, number>> = {};

  for (const exp of expenses) {
    if (!net[exp.paid_by]) net[exp.paid_by] = {};
    net[exp.paid_by][exp.debtor] = (net[exp.paid_by][exp.debtor] || 0) + exp.share;
  }

  for (const s of settlements) {
    if (!net[s.to_user]) net[s.to_user] = {};
    net[s.to_user][s.from_user] = (net[s.to_user][s.from_user] || 0) - s.amount;
  }

  // Flatten to Balance[]
  const balances: Balance[] = [];
  const users = getAllUsers();
  const userMap = Object.fromEntries(users.map((u: any) => [u.id, u.name]));

  for (const [from, debts] of Object.entries(net)) {
    for (const [to, amount] of Object.entries(debts)) {
      if (amount > 0.01) {
        balances.push({
          from_user: to, from_name: userMap[to] || to,
          to_user: from, to_name: userMap[from] || from,
          amount: Math.round(amount * 100) / 100
        });
      }
    }
  }

  return balances;
}

export function getUserBalanceInGroup(groupId: string, userId: string): number {
  const balances = getGroupBalances(groupId);
  let total = 0;
  for (const b of balances) {
    if (b.to_user === userId) total += b.amount;
    if (b.from_user === userId) total -= b.amount;
  }
  return Math.round(total * 100) / 100;
}

// ── SETTLEMENTS ──

export function createSettlement(groupId: string, fromUser: string, toUser: string, amount: number, date: string) {
  const db = getDb();
  const id = uuid();
  db.prepare('INSERT INTO settlements (id, group_id, from_user, to_user, amount, date) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, groupId, fromUser, toUser, amount, date);
  return id;
}

export function getSettlements(groupId: string) {
  return getDb().prepare(`
    SELECT s.*, 
      fu.name as from_name, fu.avatar_color as from_color,
      tu.name as to_name, tu.avatar_color as to_color
    FROM settlements s
    JOIN users fu ON s.from_user = fu.id
    JOIN users tu ON s.to_user = tu.id
    WHERE s.group_id = ?
    ORDER BY s.date DESC
  `).all(groupId);
}

export function deleteSettlement(id: string) {
  getDb().prepare('DELETE FROM settlements WHERE id = ?').run(id);
}

export function updateGroup(id: string, name: string, emoji: string, memberIds: string[]) {
  const db = getDb();
  db.transaction(() => {
    db.prepare('UPDATE groups SET name = ?, emoji = ? WHERE id = ?').run(name, emoji, id);
    if (memberIds && memberIds.length > 0) {
      // Clear and re-add members
      db.prepare('DELETE FROM group_members WHERE group_id = ?').run(id);
      const insertMember = db.prepare('INSERT OR IGNORE INTO group_members (group_id, user_id) VALUES (?, ?)');
      for (const uid of memberIds) insertMember.run(id, uid);
    }
  })();
}

// ── DASHBOARD ──

export function getDashboard(selfUserId: string) {
  const groups = getAllGroups();
  const recentExpenses = getDb().prepare(`
    SELECT e.*, g.name as group_name, g.emoji as group_emoji,
      u.name as paid_by_name
    FROM expenses e
    JOIN groups g ON e.group_id = g.id
    JOIN users u ON e.paid_by = u.id
    ORDER BY e.date DESC, e.created_at DESC
    LIMIT 10
  `).all();

  // Total balance across all groups
  let totalOwed = 0;
  let totalOwe = 0;
  const groupBalances = groups.map((g: any) => {
    const bal = getUserBalanceInGroup(g.id, selfUserId);
    if (bal > 0) totalOwed += bal;
    else totalOwe += Math.abs(bal);
    return { ...g, balance: bal };
  });

  return {
    totalOwed: Math.round(totalOwed * 100) / 100,
    totalOwe: Math.round(totalOwe * 100) / 100,
    netBalance: Math.round((totalOwed - totalOwe) * 100) / 100,
    groups: groupBalances,
    recentExpenses
  };
}

// ── SEED DATA ──

export function seedDemoData() {
  const db = getDb();
  const count = (db.prepare('SELECT COUNT(*) as c FROM users').get() as any).c;
  if (count > 0) return;

  const self = createUser('Juanma', true, 'juanma@test.com');
  const ana = createUser('Ana');
  const carlos = createUser('Carlos');
  const maria = createUser('María');

  // Trip to Lisbon
  const g1 = createGroup('Trip to Lisbon', '🇵🇹', [self.id, ana.id, carlos.id]);

  createExpense(g1.id, 'Dinner at Time Out', 89.50, self.id, 'equal', 'food', '2026-04-18', [self.id, ana.id, carlos.id], undefined, self.id);
  createExpense(g1.id, 'Airbnb 3 nights', 312, ana.id, 'equal', 'accommodation', '2026-04-17', [self.id, ana.id, carlos.id], undefined, self.id);
  createExpense(g1.id, 'Uber to airport', 24.80, carlos.id, 'equal', 'transport', '2026-04-16', [self.id, ana.id, carlos.id], undefined, self.id);
  createExpense(g1.id, 'Pasteis de Belem', 18.60, self.id, 'equal', 'food', '2026-04-18', [self.id, ana.id, carlos.id], undefined, self.id);
  createExpense(g1.id, 'Tram 28 tickets', 9.00, ana.id, 'equal', 'transport', '2026-04-18', [self.id, ana.id, carlos.id], undefined, self.id);

  // Flat expenses
  const g2 = createGroup('Flat expenses', '🏠', [self.id, maria.id]);

  createExpense(g2.id, 'Electricity April', 67.30, self.id, 'equal', 'utilities', '2026-04-15', [self.id, maria.id], undefined, self.id);
  createExpense(g2.id, 'Internet', 39.99, maria.id, 'equal', 'utilities', '2026-04-10', [self.id, maria.id], undefined, self.id);
  createExpense(g2.id, 'Groceries', 52.40, self.id, 'equal', 'food', '2026-04-12', [self.id, maria.id], undefined, self.id);

  // Weekend trip
  const g3 = createGroup('Weekend Toledo', '🏰', [self.id, ana.id, carlos.id, maria.id]);

  createExpense(g3.id, 'Train tickets', 48.00, self.id, 'equal', 'transport', '2026-04-05', [self.id, ana.id, carlos.id, maria.id], undefined, self.id);
  createExpense(g3.id, 'Lunch', 64.80, carlos.id, 'equal', 'food', '2026-04-05', [self.id, ana.id, carlos.id, maria.id], undefined, self.id);

  console.log('✅ Demo data seeded');
}

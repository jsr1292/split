import { getDb } from './index';
import { v4 as uuid } from 'uuid';
import { getCachedRate, convert } from '../currency';

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

export function createUser(name: string, isSelf = false, email?: string, baseCurrency?: string) {
  const colors = ['#c9a84c', '#3b82f6', '#a855f7', '#00e5a0', '#ff4d6a', '#f59e0b', '#06b6d4', '#ec4899'];
  const id = uuid();
  const color = colors[Date.now() % colors.length];
  getDb().prepare('INSERT INTO users (id, name, email, avatar_color, is_self, base_currency) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, name, email || null, color, isSelf ? 1 : 0, baseCurrency || 'EUR');
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

export function createGroup(name: string, emoji: string, memberIds: string[], defaultCurrency?: string) {
  const db = getDb();
  const id = uuid();
  const insert = db.transaction(() => {
    db.prepare('INSERT INTO groups (id, name, emoji, currency) VALUES (?, ?, ?, ?)').run(id, name, emoji, defaultCurrency || 'EUR');
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

export function getSharedExpenses(selfId: string, personId: string) {
  return getDb().prepare(`
    SELECT DISTINCT e.*, u.name as paid_by_name, u.avatar_color as paid_by_color, g.name as group_name, g.emoji as group_emoji
    FROM expenses e
    JOIN users u ON e.paid_by = u.id
    JOIN groups g ON e.group_id = g.id
    JOIN expense_splits es1 ON e.id = es1.expense_id AND es1.user_id = ?
    JOIN expense_splits es2 ON e.id = es2.expense_id AND es2.user_id = ?
    WHERE es1.user_id = ? AND es2.user_id = ?
    ORDER BY e.date DESC
  `).all(selfId, personId, selfId, personId);
}

export function deleteExpense(id: string) {
  const db = getDb();
  db.prepare('DELETE FROM expense_splits WHERE expense_id = ?').run(id);
  db.prepare('DELETE FROM expense_items WHERE expense_id = ?').run(id);
  db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
}

export function getExpenseItems(expenseId: string) {
  return getDb().prepare('SELECT * FROM expense_items WHERE expense_id = ?').all(expenseId);
}

export function getExpenseItemSplits(itemId: string) {
  return getDb().prepare(`
    SELECT eis.*, u.name as user_name, u.avatar_color as user_color
    FROM expense_item_splits eis
    JOIN users u ON eis.user_id = u.id
    WHERE eis.item_id = ?
  `).all(itemId);
}

export function createExpense(
  groupId: string, description: string, amount: number, paidBy: string,
  splitType: string, category: string, date: string, splitUserIds: string[],
  exactShares?: Record<string, number>, createdBy?: string, note?: string,
  recurring?: string, recurringParentId?: string, currency?: string,
  idempotencyKey?: string
): { expense: any; created: boolean } {
  const db = getDb();

  // Idempotency check: if key provided and exists, return existing expense
  if (idempotencyKey) {
    const existing = db.prepare('SELECT * FROM expenses WHERE idempotency_key = ?').get(idempotencyKey);
    if (existing) {
      return { expense: existing, created: false };
    }
  }

  const id = uuid();
  const expenseCurrency = currency || 'EUR';

  // Get group to know default currency
  const group = getGroupById(groupId) as any;
  const groupDefaultCurrency = group?.currency || 'EUR';
  const finalCurrency = expenseCurrency || groupDefaultCurrency;

  const insert = db.transaction(() => {
    db.prepare(`
      INSERT INTO expenses (id, group_id, description, amount, currency, paid_by, split_type, category, date, note, created_by, recurring, recurring_parent_id, idempotency_key)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, groupId, description, amount, finalCurrency, paidBy, splitType, category, date, note || null, createdBy || null, recurring || null, recurringParentId || null, idempotencyKey || null);

    // Calculate shares with base_amount in each user's base currency
    const insertSplit = db.prepare('INSERT INTO expense_splits (id, expense_id, user_id, share, base_currency, base_amount) VALUES (?, ?, ?, ?, ?, ?)');
    const splitCount = splitUserIds.length;
    for (const uid of splitUserIds) {
      let share: number;
      if (splitType === 'exact' && exactShares && exactShares[uid] !== undefined) {
        share = exactShares[uid];
      } else {
        share = Math.round((amount / splitCount) * 100) / 100;
      }

      // Get user's base currency
      const user = getUserById(uid) as any;
      const userBaseCurrency = user?.base_currency || 'EUR';

      // Calculate base_amount - convert from expense currency to user's base currency
      const rate = getCachedRate(date, finalCurrency, userBaseCurrency);
      const baseAmount = Math.round(share * rate * 100) / 100;

      insertSplit.run(uuid(), id, uid, share, userBaseCurrency, baseAmount);
    }
  });

  insert();
  return { expense: getExpenseById(id), created: true };
}

export function createRecurringInstances(parentExpense: any, recurring: string) {
  const db = getDb();
  const parentId = parentExpense.id;
  const groupId = parentExpense.group_id;
  const description = parentExpense.description;
  const amount = parentExpense.amount;
  const paidBy = parentExpense.paid_by;
  const splitType = parentExpense.split_type || 'equal';
  const category = parentExpense.category;
  const note = parentExpense.note;
  const createdBy = parentExpense.created_by;

  // Get splits for this expense
  const splits = getExpenseSplits(parentId);
  const splitUserIds = splits.map((s: any) => s.user_id);

  let nextDate = new Date(parentExpense.date);
  const instances: any[] = [];

  for (let i = 0; i < 12; i++) {
    if (recurring === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
    else if (recurring === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
    else if (recurring === 'yearly') nextDate.setFullYear(nextDate.getFullYear() + 1);
    else break;

    const dateStr = nextDate.toISOString().split('T')[0];
    const inst = createExpense(groupId, description, amount, paidBy, splitType, category, dateStr, splitUserIds, undefined, createdBy, note, null, parentId);
    instances.push(inst.expense);
  }

  return instances;
}

export function createExpenseWithItems(
  groupId: string, description: string, amount: number, paidBy: string,
  splitType: string, category: string, date: string, splitUserIds: string[],
  createdBy: string, note: string, items: { description: string; amount: number; splitUserIds: string[] }[],
  recurring?: string, currency?: string
): { expense: any; created: boolean } {
  const db = getDb();
  const id = uuid();
  const expenseCurrency = currency || 'EUR';

  const insert = db.transaction(() => {
    db.prepare(`
      INSERT INTO expenses (id, group_id, description, amount, currency, paid_by, split_type, category, date, note, created_by, recurring)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, groupId, description, amount, expenseCurrency, paidBy, splitType, category, date, note || null, createdBy || null, recurring || null);

    // Insert items
    const insertItem = db.prepare('INSERT INTO expense_items (id, expense_id, description, amount) VALUES (?, ?, ?, ?)');
    const insertItemSplit = db.prepare('INSERT INTO expense_item_splits (id, item_id, user_id, share) VALUES (?, ?, ?, ?)');

    for (const item of items) {
      const itemId = uuid();
      insertItem.run(itemId, id, item.description, item.amount);

      const itemSplitCount = item.splitUserIds.length;
      for (const uid of item.splitUserIds) {
        const share = Math.round((item.amount / itemSplitCount) * 100) / 100;
        insertItemSplit.run(uuid(), itemId, uid, share);
      }
    }
  });

  insert();
  return { expense: getExpenseById(id), created: true };
}

export function updateExpense(
  id: string, data: { description: string; amount: number; paidBy: string; category: string; date: string; note?: string; splitUserIds: string[]; currency?: string }
) {
  const db = getDb();
  const expense = getExpenseById(id) as any;
  const currency = data.currency || expense?.currency || 'EUR';

  db.transaction(() => {
    db.prepare(`
      UPDATE expenses SET description = ?, amount = ?, paid_by = ?, category = ?, date = ?, note = ?, currency = ?
      WHERE id = ?
    `).run(data.description, data.amount, data.paidBy, data.category, data.date, data.note || null, currency, id);
    db.prepare('DELETE FROM expense_splits WHERE expense_id = ?').run(id);

    // Get group for default currency
    const group = getGroupById(expense.group_id) as any;
    const splitCount = data.splitUserIds.length;
    const insertSplit = db.prepare('INSERT INTO expense_splits (id, expense_id, user_id, share, base_currency, base_amount) VALUES (?, ?, ?, ?, ?, ?)');

    for (const uid of data.splitUserIds) {
      const share = Math.round((data.amount / splitCount) * 100) / 100;

      // Get user's base currency
      const user = getUserById(uid) as any;
      const userBaseCurrency = user?.base_currency || 'EUR';

      // Calculate base_amount
      const rate = getCachedRate(data.date, currency, userBaseCurrency);
      const baseAmount = Math.round(share * rate * 100) / 100;

      insertSplit.run(uuid(), id, uid, share, userBaseCurrency, baseAmount);
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
  currency?: string;
}

export function getGroupBalances(groupId: string): Balance[] {
  const db = getDb();
  // Use base_amount for balances - each person's debt is in their own currency
  const expenses = db.prepare(`
    SELECT e.paid_by, es.user_id as debtor, es.base_amount, es.base_currency
    FROM expenses e
    JOIN expense_splits es ON e.id = es.expense_id
    WHERE e.group_id = ? AND es.user_id != e.paid_by
  `).all(groupId);

  const settlements = db.prepare(`
    SELECT from_user, to_user, amount
    FROM settlements
    WHERE group_id = ?
  `).all(groupId);

  // Net balances tracked per currency
  // Key: `${from}:${to}:${currency}` = amount that 'from' owes 'to' in 'currency'
  const net: Record<string, number> = {};

  function netKey(from: string, to: string, currency: string) {
    return `${from}:${to}:${currency}`;
  }

  for (const exp of expenses) {
    // The debtor owes the payer in the debtor's base currency
    const key = netKey(exp.debtor, exp.paid_by, exp.base_currency || 'EUR');
    net[key] = (net[key] || 0) + (exp.base_amount || 0);
  }

  for (const s of settlements) {
    // Settlements are recorded in the receiver's base currency (assumed EUR for now)
    const key = netKey(s.from_user, s.to_user, 'EUR');
    net[key] = (net[key] || 0) - s.amount;
  }

  // Flatten to Balance[]
  const balances: Balance[] = [];
  const users = getAllUsers();
  const userMap = Object.fromEntries(users.map((u: any) => [u.id, u.name]));

  for (const [key, amount] of Object.entries(net)) {
    if (amount > 0.01) {
      const [from, to, currency] = key.split(':');
      balances.push({
        from_user: from, from_name: userMap[from] || from,
        to_user: to, to_name: userMap[to] || to,
        amount: Math.round(amount * 100) / 100,
        currency: currency
      });
    }
  }

  return balances;
}

export function getUserBalanceInGroup(groupId: string, userId: string): number {
  const balances = getGroupBalances(groupId);
  let total = 0;
  for (const b of balances) {
    if (b.to_user === userId) {
      // User is owed this amount in the currency specified
      const currency = b.currency || 'EUR';
      if (currency === 'EUR') {
        total += b.amount;
      } else {
        // Convert to EUR using cached rate
        const rate = getCachedRate(new Date().toISOString().split('T')[0], currency, 'EUR');
        total += b.amount * rate;
      }
    }
    if (b.from_user === userId) {
      // User owes this amount in the currency specified
      const currency = b.currency || 'EUR';
      if (currency === 'EUR') {
        total -= b.amount;
      } else {
        // Convert to EUR using cached rate
        const rate = getCachedRate(new Date().toISOString().split('T')[0], currency, 'EUR');
        total -= b.amount * rate;
      }
    }
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

export function updateGroup(id: string, name: string, emoji: string, memberIds: string[], defaultCurrency?: string) {
  const db = getDb();
  db.transaction(() => {
    if (defaultCurrency) {
      db.prepare('UPDATE groups SET name = ?, emoji = ?, currency = ? WHERE id = ?').run(name, emoji, defaultCurrency, id);
    } else {
      db.prepare('UPDATE groups SET name = ?, emoji = ? WHERE id = ?').run(name, emoji, id);
    }
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

  // Trip to Lisbon (EUR)
  const g1 = createGroup('Trip to Lisbon', '🇵🇹', [self.id, ana.id, carlos.id], 'EUR');

  createExpense(g1.id, 'Dinner at Time Out', 89.50, self.id, 'equal', 'food', '2026-04-18', [self.id, ana.id, carlos.id], undefined, self.id, undefined, undefined, undefined, 'EUR');
  createExpense(g1.id, 'Airbnb 3 nights', 312, ana.id, 'equal', 'accommodation', '2026-04-17', [self.id, ana.id, carlos.id], undefined, self.id, undefined, undefined, undefined, 'EUR');
  createExpense(g1.id, 'Uber to airport', 24.80, carlos.id, 'equal', 'transport', '2026-04-16', [self.id, ana.id, carlos.id], undefined, self.id, undefined, undefined, undefined, 'EUR');
  createExpense(g1.id, 'Pasteis de Belem', 18.60, self.id, 'equal', 'food', '2026-04-18', [self.id, ana.id, carlos.id], undefined, self.id, undefined, undefined, undefined, 'EUR');
  createExpense(g1.id, 'Tram 28 tickets', 9.00, ana.id, 'equal', 'transport', '2026-04-18', [self.id, ana.id, carlos.id], undefined, self.id, undefined, undefined, undefined, 'EUR');

  // Flat expenses (EUR)
  const g2 = createGroup('Flat expenses', '🏠', [self.id, maria.id], 'EUR');

  createExpense(g2.id, 'Electricity April', 67.30, self.id, 'equal', 'utilities', '2026-04-15', [self.id, maria.id], undefined, self.id, undefined, undefined, undefined, 'EUR');
  createExpense(g2.id, 'Internet', 39.99, maria.id, 'equal', 'utilities', '2026-04-10', [self.id, maria.id], undefined, self.id, undefined, undefined, undefined, 'EUR');
  createExpense(g2.id, 'Groceries', 52.40, self.id, 'equal', 'food', '2026-04-12', [self.id, maria.id], undefined, self.id, undefined, undefined, undefined, 'EUR');

  // Weekend trip (EUR)
  const g3 = createGroup('Weekend Toledo', '🏰', [self.id, ana.id, carlos.id, maria.id], 'EUR');

  createExpense(g3.id, 'Train tickets', 48.00, self.id, 'equal', 'transport', '2026-04-05', [self.id, ana.id, carlos.id, maria.id], undefined, self.id, undefined, undefined, undefined, 'EUR');
  createExpense(g3.id, 'Lunch', 64.80, carlos.id, 'equal', 'food', '2026-04-05', [self.id, ana.id, carlos.id, maria.id], undefined, self.id, undefined, undefined, undefined, 'EUR');

  // London Weekend (GBP)
  const g4 = createGroup('London Weekend', '🇬🇧', [self.id, ana.id, carlos.id], 'GBP');

  createExpense(g4.id, 'Underground tickets', 45.00, self.id, 'equal', 'transport', '2026-04-10', [self.id, ana.id, carlos.id], undefined, self.id, undefined, undefined, undefined, 'GBP');
  createExpense(g4.id, 'Shakespeare Globe', 78.50, ana.id, 'equal', 'activities', '2026-04-10', [self.id, ana.id, carlos.id], undefined, self.id, undefined, undefined, undefined, 'GBP');
  createExpense(g4.id, 'Fish & Chips', 56.20, carlos.id, 'equal', 'food', '2026-04-11', [self.id, ana.id, carlos.id], undefined, self.id, undefined, undefined, undefined, 'GBP');
  createExpense(g4.id, 'British Museum', 0, self.id, 'equal', 'activities', '2026-04-11', [self.id, ana.id, carlos.id], undefined, self.id, undefined, undefined, undefined, 'GBP');
  createExpense(g4.id, 'Pub dinner', 92.00, self.id, 'equal', 'food', '2026-04-11', [self.id, ana.id, carlos.id], undefined, self.id, undefined, undefined, undefined, 'GBP');

  console.log('✅ Demo data seeded');
}

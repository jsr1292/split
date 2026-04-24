import { getDb } from './index';
import { v4 as uuid } from 'uuid';
import { getCachedRate, convert } from '../currency';
import { simplifyDebts, type Balance } from '../debt';

export { getDb };

// ── USERS ──

export function getAllUsers() {
  return getDb().prepare('SELECT * FROM users ORDER BY name').all();
}

export function getUserById(id: string) {
  return getDb().prepare('SELECT * FROM users WHERE id = ?').get(id);
}

// Batch-fetch users by IDs — avoids N queries when splitting across many users
export function getUsersByIds(ids: string[]): Record<string, any> {
  if (ids.length === 0) return {};
  const placeholders = ids.map(() => '?').join(',');
  const rows = getDb().prepare(`SELECT * FROM users WHERE id IN (${placeholders})`).all(...ids) as any[];
  const result: Record<string, any> = {};
  for (const row of rows) result[row.id] = row;
  return result;
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

// Groups filtered by membership — only groups the user belongs to
export function getGroupsForUser(userId: string) {
  return getDb().prepare(`
    SELECT g.*, 
      COUNT(DISTINCT gm2.user_id) as member_count,
      COUNT(DISTINCT e.id) as expense_count
    FROM groups g
    JOIN group_members gm ON g.id = gm.group_id AND gm.user_id = ?
    LEFT JOIN group_members gm2 ON g.id = gm2.group_id
    LEFT JOIN expenses e ON g.id = e.group_id
    GROUP BY g.id
    ORDER BY g.created_at DESC
  `).all(userId);
}

// Check if user is a member of a group
export function isGroupMember(groupId: string, userId: string): boolean {
  const row = getDb().prepare('SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?').get(groupId, userId);
  return !!row;
}

// Get users that share any group with the given user
export function getUsersInSharedGroups(userId: string) {
  return getDb().prepare(`
    SELECT DISTINCT u.* FROM users u
    JOIN group_members gm1 ON u.id = gm1.user_id
    JOIN group_members gm2 ON gm1.group_id = gm2.group_id
    WHERE gm2.user_id = ?
    ORDER BY u.name
  `).all(userId);
}

export function getGroupById(id: string) {
  return getDb().prepare('SELECT * FROM groups WHERE id = ?').get(id);
}

export function createGroup(name: string, emoji: string, memberIds: string[], defaultCurrency?: string, currencyMode?: string) {
  const db = getDb();
  const id = uuid();
  const currency = defaultCurrency || 'EUR';
  const mode = currencyMode || 'single';
  const insert = db.transaction(() => {
    db.prepare('INSERT INTO groups (id, name, emoji, currency, currency_mode, base_currency) VALUES (?, ?, ?, ?, ?, ?)').run(id, name, emoji, currency, mode, currency);
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
    JOIN expense_splits es ON e.id = es.expense_id
    WHERE es.user_id IN (?, ?)
    GROUP BY e.id
    HAVING COUNT(DISTINCT es.user_id) = 2
    ORDER BY e.date DESC
  `).all(selfId, personId);
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

// Batch version: fetches splits for all item IDs in one query
// Returns a map of itemId → splits[]
export function getExpenseItemSplitsForItems(itemIds: string[]): Record<string, any[]> {
  if (itemIds.length === 0) return {};
  const placeholders = itemIds.map(() => '?').join(',');
  const splits = getDb().prepare(`
    SELECT eis.*, u.name as user_name, u.avatar_color as user_color, eis.item_id
    FROM expense_item_splits eis
    JOIN users u ON eis.user_id = u.id
    WHERE eis.item_id IN (${placeholders})
  `).all(...itemIds) as any[];
  const result: Record<string, any[]> = {};
  for (const s of splits) {
    if (!result[s.item_id]) result[s.item_id] = [];
    result[s.item_id].push(s);
  }
  // Fill in empty arrays for items with no splits
  for (const id of itemIds) {
    if (!result[id]) result[id] = [];
  }
  return result;
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

    // Validate exact shares sum
    if (splitType === 'exact' && exactShares) {
      const sum = Object.values(exactShares).reduce((a: number, b: number) => a + b, 0);
      if (Math.abs(sum - amount) > 0.01) {
        throw new Error('Exact shares must sum to total amount');
      }
    }

    // Pre-compute equal shares with remainder distribution
    const equalBase = Math.floor((amount * 100) / splitCount) / 100;
    const equalRemainder = Math.round((amount - equalBase * splitCount) * 100) / 100;
    let remainderDistributed = false;

    // Batch-fetch all split users — single query instead of N
    const users = getUsersByIds(splitUserIds);

    for (const uid of splitUserIds) {
      let share: number;
      if (splitType === 'exact' && exactShares && exactShares[uid] !== undefined) {
        share = exactShares[uid];
      } else {
        share = equalBase;
        // Distribute rounding remainder to the first user
        if (!remainderDistributed && equalRemainder > 0) {
          share = Math.round((equalBase + equalRemainder) * 100) / 100;
          remainderDistributed = true;
        }
      }

      // Get user's base currency (batch-fetched, zero extra queries)
      const user = users[uid];
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
    const inst = createExpense(groupId, description, amount, paidBy, splitType, category, dateStr, splitUserIds, undefined, createdBy, note, recurring, parentId);
    instances.push(inst.expense);
  }

  return instances;
}

export function createExpenseWithItems(
  groupId: string, description: string, amount: number, paidBy: string,
  splitType: string, category: string, date: string, splitUserIds: string[],
  createdBy: string, note: string, items: { description: string; amount: number; splitUserIds: string[] }[],
  recurring?: string, currency?: string, idempotencyKey?: string
): { expense: any; created: boolean } {
  const db = getDb();
  const id = uuid();
  const expenseCurrency = currency || 'EUR';

  // Idempotency check
  if (idempotencyKey) {
    const existing = db.prepare('SELECT * FROM expenses WHERE idempotency_key = ?').get(idempotencyKey);
    if (existing) return { expense: getExpenseById(existing.id), created: false };
  }

  // Validate items sum to total
  const itemsTotal = items.reduce((s, i) => s + i.amount, 0);
  if (Math.abs(itemsTotal - amount) > 0.01) {
    throw new Error(`Items total (${itemsTotal.toFixed(2)}) does not match expense amount (${amount.toFixed(2)})`);
  }

  const insert = db.transaction(() => {
    db.prepare(`
      INSERT INTO expenses (id, group_id, description, amount, currency, paid_by, split_type, category, date, note, created_by, recurring)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, groupId, description, amount, expenseCurrency, paidBy, splitType, category, date, note || null, createdBy || null, recurring || null);

    // Also insert top-level expense_splits for balance calculation
    const insertSplit = db.prepare('INSERT INTO expense_splits (id, expense_id, user_id, share, base_currency, base_amount) VALUES (?, ?, ?, ?, ?, ?)');
    const splitCount = splitUserIds.length;
    const equalBase = Math.floor((amount * 100) / splitCount) / 100;
    const equalRemainder = Math.round((amount - equalBase * splitCount) * 100) / 100;
    let remainderDistributed = false;

    // Batch-fetch all split users — single query instead of N
    const users = getUsersByIds(splitUserIds);

    for (const uid of splitUserIds) {
      let share = equalBase;
      if (!remainderDistributed && equalRemainder > 0) {
        share = Math.round((equalBase + equalRemainder) * 100) / 100;
        remainderDistributed = true;
      }
      const user = users[uid];
      const userBaseCurrency = user?.base_currency || 'EUR';
      const rate = getCachedRate(date, expenseCurrency, userBaseCurrency);
      const baseAmount = Math.round(share * rate * 100) / 100;
      insertSplit.run(uuid(), id, uid, share, userBaseCurrency, baseAmount);
    }

    // Insert items
    const insertItem = db.prepare('INSERT INTO expense_items (id, expense_id, description, amount) VALUES (?, ?, ?, ?)');
    const insertItemSplit = db.prepare('INSERT INTO expense_item_splits (id, item_id, user_id, share) VALUES (?, ?, ?, ?)');

    for (const item of items) {
      const itemId = uuid();
      insertItem.run(itemId, id, item.description, item.amount);

      const itemSplitCount = item.splitUserIds.length;
      const itemBase = Math.floor((item.amount * 100) / itemSplitCount) / 100;
      const itemRemainder = Math.round((item.amount - itemBase * itemSplitCount) * 100) / 100;
      let itemRemainderDistributed = false;
      for (const uid of item.splitUserIds) {
        let share = itemBase;
        if (!itemRemainderDistributed && itemRemainder > 0) {
          share = Math.round((itemBase + itemRemainder) * 100) / 100;
          itemRemainderDistributed = true;
        }
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

    // Batch-fetch all split users — single query instead of N
    const users = getUsersByIds(data.splitUserIds);

    for (const uid of data.splitUserIds) {
      const share = Math.round((data.amount / splitCount) * 100) / 100;

      // Get user's base currency (batch-fetched)
      const user = users[uid];
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
  const group = db.prepare('SELECT currency, currency_mode, base_currency FROM groups WHERE id = ?').get(groupId) as any;
  const groupCurrency = group?.currency || 'EUR';
  const currencyMode = group?.currency_mode || 'single';
  const baseCurrency = group?.base_currency || groupCurrency;

  // Use base_amount for balances - each person's debt is in their own currency
  const expenses = db.prepare(`
    SELECT e.paid_by, es.user_id as debtor, es.base_amount, es.base_currency, es.share, e.currency as expense_currency
    FROM expenses e
    JOIN expense_splits es ON e.id = es.expense_id
    WHERE e.group_id = ? AND es.user_id != e.paid_by
  `).all(groupId);

  const settlements = db.prepare(`
    SELECT from_user, to_user, amount
    FROM settlements
    WHERE group_id = ?
  `).all(groupId);

  // Net balances
  const net: Record<string, number> = {};

  function netKey(from: string, to: string) {
    return `${from}:${to}`;
  }

  if (currencyMode === 'fx_lock') {
    // Fair FX: convert everything to the group's base_currency using locked rates
    for (const exp of expenses) {
      // base_amount is already in the user's base currency
      // For fx_lock, we want everything in the group's base_currency
      // If the debtor's base_currency matches baseCurrency, use base_amount directly
      // Otherwise convert from the expense currency using the locked rate
      let amount: number;
      if (exp.base_currency === baseCurrency) {
        amount = exp.base_amount;
      } else {
        // Convert share (in expense currency) to base_currency using cached rate
        const rate = getCachedRate('', exp.expense_currency, baseCurrency);
        amount = Math.round(exp.share * rate * 100) / 100;
      }
      const key = netKey(exp.debtor, exp.paid_by);
      net[key] = (net[key] || 0) + amount;
    }
  } else {
    // Single currency: use share amounts directly (in expense currency)
    for (const exp of expenses) {
      const key = netKey(exp.debtor, exp.paid_by);
      net[key] = (net[key] || 0) + exp.share;
    }
  }

  for (const s of settlements) {
    const key = netKey(s.from_user, s.to_user);
    net[key] = (net[key] || 0) - s.amount;
  }

  // Flatten to Balance[]
  const balances: Balance[] = [];
  // Collect all user IDs that appear in balances, then fetch only those names
  const userIds = [...new Set([
    ...expenses.map((e: any) => e.paid_by),
    ...expenses.map((e: any) => e.debtor),
    ...settlements.map((s: any) => s.from_user),
    ...settlements.map((s: any) => s.to_user),
  ])];
  const userMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const placeholders = userIds.map(() => '?').join(',');
    const users = db.prepare(`SELECT id, name FROM users WHERE id IN (${placeholders})`).all(...userIds);
    for (const u of users) {
      userMap[(u as any).id] = (u as any).name;
    }
  }

  for (const [key, amount] of Object.entries(net)) {
    if (amount > 0.01) {
      const [from, to] = key.split(':');
      balances.push({
        from_user: from, from_name: userMap[from] || from,
        to_user: to, to_name: userMap[to] || to,
        amount: Math.round(amount * 100) / 100,
        currency: currencyMode === 'fx_lock' ? baseCurrency : groupCurrency
      });
    }
  }

  return simplifyDebts(balances);
}

export function getUserBalanceInGroup(groupId: string, userId: string): number {
  const balances = getGroupBalances(groupId);
  let total = 0;
  for (const b of balances) {
    if (b.to_user === userId) {
      // b.amount is already in the user's base currency (base_amount from expense_splits)
      // No conversion needed — sum directly
      total += b.amount;
    }
    if (b.from_user === userId) {
      total -= b.amount;
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

export function updateGroup(id: string, name: string, emoji: string, memberIds: string[], defaultCurrency?: string, currencyMode?: string) {
  const db = getDb();
  db.transaction(() => {
    if (defaultCurrency || currencyMode) {
      const group = db.prepare('SELECT currency, currency_mode FROM groups WHERE id = ?').get(id) as any;
      const curr = defaultCurrency || group?.currency || 'EUR';
      const mode = currencyMode || group?.currency_mode || 'single';
      db.prepare('UPDATE groups SET name = ?, emoji = ?, currency = ?, currency_mode = ?, base_currency = ? WHERE id = ?').run(name, emoji, curr, mode, curr, id);
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
  const groups = getGroupsForUser(selfUserId);
  const groupIds = groups.map((g: any) => g.id);
  let recentExpenses: any[] = [];
  if (groupIds.length > 0) {
    const placeholders = groupIds.map(() => '?').join(',');
    recentExpenses = getDb().prepare(`
      SELECT e.*, g.name as group_name, g.emoji as group_emoji,
        u.name as paid_by_name
      FROM expenses e
      JOIN groups g ON e.group_id = g.id
      JOIN users u ON e.paid_by = u.id
      WHERE e.group_id IN (${placeholders})
      ORDER BY e.date DESC, e.created_at DESC
      LIMIT 10
    `).all(...groupIds);
  }

  // Batch: compute all group balances in a single query (was N queries, now 1)
  const balancesByGroup = getUserBalancesForGroups(
    groups.map((g: any) => g.id),
    selfUserId
  );

  // Total balance across all groups
  let totalOwed = 0;
  let totalOwe = 0;
  const groupBalances = groups.map((g: any) => {
    const bal = balancesByGroup[g.id] ?? 0;
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

// Batch version: compute a user's balance across multiple groups in a single query
export function getUserBalancesForGroups(groupIds: string[], userId: string): Record<string, number> {
  if (groupIds.length === 0) return {};
  const placeholders = groupIds.map(() => '?').join(',');
  const db = getDb();

  // Get all expense splits for this user across all groups (join through expenses to get group_id)
  const splits = db.prepare(`
    SELECT e.group_id as group_id, es.base_amount, es.base_currency, e.paid_by
    FROM expense_splits es
    JOIN expenses e ON es.expense_id = e.id
    WHERE es.user_id = ? AND e.group_id IN (${placeholders})
  `).all(userId, ...groupIds) as any[];

  // Get all settlements involving this user across all groups
  const settlements = db.prepare(`
    SELECT from_user, to_user, amount, group_id
    FROM settlements
    WHERE group_id IN (${placeholders}) AND (from_user = ? OR to_user = ?)
  `).all(...groupIds, userId, userId) as any[];

  // Initialize balance per group
  const balances: Record<string, number> = {};
  for (const gid of groupIds) balances[gid] = 0;

  // Process splits: user paid by others → they owe the payer
  for (const s of splits) {
    const bal = Math.round(s.base_amount * 100) / 100;
    if (s.paid_by === userId) {
      // User paid → others owe user (split base_amount already reflects what user should receive, so we ADD it)
      // Actually: base_amount is what user owes payer. If payer is user, user is owed.
      balances[s.group_id] += bal;
    } else {
      // User is debtor → subtract what they owe
      balances[s.group_id] -= bal;
    }
  }

  // Process settlements
  for (const s of settlements) {
    if (s.from_user === userId) {
      // User paid settlement → group_id from settlement, they paid someone
      balances[s.group_id] -= Math.round(s.amount * 100) / 100;
    } else {
      // User received settlement
      balances[s.group_id] += Math.round(s.amount * 100) / 100;
    }
  }

  return balances;
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

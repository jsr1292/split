export interface Balance {
  from_user: string;
  from_name: string;
  to_user: string;
  to_name: string;
  amount: number;
  currency?: string;
}

/**
 * Greedy debt simplification algorithm.
 * Takes pairwise balances and returns the minimal number of transfers needed.
 *
 * Algorithm:
 * 1. Calculate net balance per user (positive = owed, negative = owes)
 * 2. Split into debtors (negative) and creditors (positive)
 * 3. Sort debtors ascending (most negative first), creditors descending (most positive first)
 * 4. Match largest debtor with largest creditor, transfer min(abs(debt), credit)
 * 5. Repeat until settled
 */
export function simplifyDebts(balances: Balance[]): Balance[] {
  if (balances.length === 0) return [];

  // Step 1: Calculate net balance per user
  const net: Record<string, number> = {};

  for (const b of balances) {
    if (!net[b.from_user]) net[b.from_user] = 0;
    if (!net[b.to_user]) net[b.to_user] = 0;
    // from_user owes b.amount → from_user balance decreases, to_user increases
    net[b.from_user] -= b.amount;
    net[b.to_user] += b.amount;
  }

  // Step 2: Split into debtors and creditors (round to 2 decimal places)
  const debtors: { id: string; amount: number }[] = [];
  const creditors: { id: string; amount: number }[] = [];

  for (const [userId, balance] of Object.entries(net)) {
    const rounded = Math.round(balance * 100) / 100;
    if (rounded < -0.01) {
      debtors.push({ id: userId, amount: Math.abs(rounded) });
    } else if (rounded > 0.01) {
      creditors.push({ id: userId, amount: rounded });
    }
  }

  // Step 3: Sort debtors ascending (most negative first), creditors descending
  debtors.sort((a, b) => b.amount - a.amount); // largest debt first
  creditors.sort((a, b) => b.amount - a.amount); // largest credit first

  // Build name map from balances
  const nameMap: Record<string, string> = {};
  for (const b of balances) {
    nameMap[b.from_user] = b.from_name;
    nameMap[b.to_user] = b.to_name;
  }

  // Step 4 & 5: Greedy matching
  const result: Balance[] = [];
  let di = 0;
  let ci = 0;

  while (di < debtors.length && ci < creditors.length) {
    const debtor = debtors[di];
    const creditor = creditors[ci];
    if (!debtor || !creditor) break;

    const transferAmount = Math.round(Math.min(debtor.amount, creditor.amount) * 100) / 100;

    if (transferAmount > 0.01) {
      result.push({
        from_user: debtor.id,
        from_name: nameMap[debtor.id] || debtor.id,
        to_user: creditor.id,
        to_name: nameMap[creditor.id] || creditor.id,
        amount: transferAmount,
        currency: balances[0]?.currency
      });
    }

    debtor.amount -= transferAmount;
    creditor.amount -= transferAmount;

    if (debtor.amount < 0.01) di++;
    if (creditor.amount < 0.01) ci++;
  }

  return result;
}

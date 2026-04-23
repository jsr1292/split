/**
 * Micro-copy utility — fun, personality-driven messages based on balance state.
 * Supports en/es via lang parameter.
 */

export type Lang = 'en' | 'es';

// Helpers
function random<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Balance = 0 — all squared away
 */
export function settledMessage(lang: Lang): string {
  if (lang === 'es') return '¡Estáis en paz! 🤝';
  return random(["You're all square! 🤝", "All squared away! 🤝", "Perfectly balanced! 🤝"]);
}

/**
 * Balance > 0 — they owe you money
 */
export function owedToYouMessage(lang: Lang, count: number = 0): string {
  if (lang === 'es') {
    if (count === 0) return 'Te deben';
    if (count === 1) return '1 persona te debe';
    return `+${count} personas te deben`;
  }
  if (count === 0) return random(["They owe you", "You're the bank 💰", "Time to collect! 💰"]);
  if (count === 1) return random(["1 person owes you", "One step closer to freedom"]);
  return random([`+${count} people owe you`, "You're the bank 💰", "Cha-ching! 💰"]);
}

/**
 * Balance < 0 — you owe money
 */
export function youOweMessage(lang: Lang): string {
  if (lang === 'es') return random(["Debes", "Te toca pagar", "Tu bolsillo llora 💸"]);
  return random(["You owe", "Time to pay up", "Your wallet is crying 💸", "Pay up! 💸"]);
}

/**
 * Settling/confetti moment
 */
export function settlingMessage(lang: Lang): string {
  if (lang === 'es') return '¡Libertad! 🎉';
  return random(["Freedom! 🎉", "Settled! 🎉", "Debts cleared! 🎉"]);
}

/**
 * Group with no expenses yet
 */
export function noExpensesMessage(lang: Lang): string {
  if (lang === 'es') return 'Aquí no pasa nada... todavía';
  return random(["Nothing happening here... yet", "The silence is loud", "Start the journey!"]);
}

/**
 * Group with only 1 expense
 */
export function oneExpenseMessage(lang: Lang): string {
  if (lang === 'es') return 'El viaje comienza';
  return random(["The journey begins", "A great start!", "First step done"]);
}

/**
 * Balance state description for group detail hero
 */
export function balanceHeroMessage(lang: Lang, balance: number, creditorCount: number = 0): string {
  if (balance === 0) return settledMessage(lang);
  if (balance > 0) return owedToYouMessage(lang, creditorCount);
  return youOweMessage(lang);
}

/**
 * Empty groups list
 */
export function emptyGroupsMessage(lang: Lang): string {
  if (lang === 'es') return 'Crea tu primer grupo para empezar a dividir gastos';
  return "Create your first group to start splitting expenses";
}

/**
 * All settled balances message
 */
export function allSettledMessage(lang: Lang): string {
  if (lang === 'es') return '¡Todo saldado! 🎉';
  return random(["All settled up! 🎉", "Freedom! 🎉", "No debts here! 🎉"]);
}

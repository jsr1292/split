<script lang="ts">
  /**
   * CategoryIcon — SVG icon for expense categories.
   * Replaces emoji pins with themed SVG icons.
   * 16x16, stroke-based, color: var(--text3)
   */
  interface Props {
    category?: string;
    size?: number;
  }

  let { category = 'other', size = 16 }: Props = $props();

  // SVG paths per category
  const icons: Record<string, string> = {
    // Fork + knife (food/dining)
    food: `<path d="M6 2v7.5a2.5 2.5 0 01-2.5 2.5C2.2 12 1.5 12.7 1.5 13.5S2.2 15 3 15c.8 0 1.5.7 1.5 1.5S3.8 18 3 18a2.5 2.5 0 010-5H8V2H6z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M14 2v7.5a2.5 2.5 0 002.5 2.5c1.3 0 2-.7 2-1.5S17.8 9 16.5 9 14.5 9 14.5 10a2.5 2.5 0 010 5H11V2h3z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
    // Car (transport/taxi)
    transport: `<path d="M5 11l1.5-4.5h11L19 11M5 11H3v4a1 1 0 001 1h1M5 11h12M5 11a1 1 0 011-1h1M19 11a1 1 0 00-1-1h-1M14 16h2M11 16h2M8 16h1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
    // Shopping bag
    shopping: `<path d="M6 8V6a4 4 0 018 0v2M6 8h12M6 8l1 9a1 1 0 001 1h8a1 1 0 001-1l1-9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
    // Ticket (entertainment)
    entertainment: `<path d="M15 5H9a4 4 0 00-4 4v0a4 4 0 004 4h6a4 4 0 004-4v0a4 4 0 00-4-4zM15 5a2 2 0 010 4M9 5a2 2 0 010 4M15 13H9M12 10v6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
    // Home (rent/housing)
    rent: `<path d="M3 12l9-9 9 9M5 10v9M11 19V10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M19 19V10l-7-7-7 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
    // Lightning bolt (utilities)
    utilities: `<path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
    // Heart (health)
    health: `<path d="M3 6.5C3 5 4 3 6 3c1.7 0 3 1.3 3 3 0 2-3 5-6 8.5C.5 12 0 10 0 8c0-2 1-4 3-4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
    // Plane (travel)
    travel: `<path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
    // Cocktail glass (drinks)
    drinks: `<path d="M8 22h8M12 11V22M7 2h10l-2 9a4 4 0 01-6 0L7 2zM7 2h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
  };

  // Fallback: receipt (other/generic)
  const receiptPath = `<path d="M6 2v20M6 2h12l-2 4H8L6 2zM6 12h12M6 17h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;

  function normalizeCategory(cat: string): string {
    const c = cat?.toLowerCase() || '';
    if (c.includes('food') || c.includes('dining') || c.includes('restaurant') || c.includes('meal')) return 'food';
    if (c.includes('transport') || c.includes('taxi') || c.includes('uber') || c.includes('gas') || c.includes('fuel')) return 'transport';
    if (c.includes('shop') || c.includes('grocery') || c.includes('store')) return 'shopping';
    if (c.includes('entertainment') || c.includes('movie') || c.includes('concert') || c.includes('show')) return 'entertainment';
    if (c.includes('rent') || c.includes('housing') || c.includes('accommodation') || c.includes('hotel')) return 'rent';
    if (c.includes('util') || c.includes('electric') || c.includes('water') || c.includes('internet') || c.includes('phone')) return 'utilities';
    if (c.includes('health') || c.includes('medical') || c.includes('pharmacy') || c.includes('doctor')) return 'health';
    if (c.includes('travel') || c.includes('flight') || c.includes('trip') || c.includes('vacation')) return 'travel';
    if (c.includes('drink') || c.includes('bar') || c.includes('coffee') || c.includes('beer')) return 'drinks';
    return 'other';
  }

  let normalized = $derived(normalizeCategory(category));
  let iconPath = $derived(icons[normalized] || receiptPath);
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  style="color: var(--text3); flex-shrink: 0;"
  aria-hidden="true"
>
  {@html iconPath}
</svg>

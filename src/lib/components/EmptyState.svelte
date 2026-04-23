<script lang="ts">
  /**
   * EmptyState — SVG illustration with floating animation for empty states.
   * Variants:
   *   - no-groups    : wallet/piggy bank outline
   *   - no-expenses  : receipt outline
   *   - all-settled  : handshake/checkmark outline
   */
  interface Props {
    variant?: 'no-groups' | 'no-expenses' | 'all-settled';
    title?: string;
    subtitle?: string;
  }

  let { variant = 'no-expenses', title = '', subtitle = '' }: Props = $props();

  const titles: Record<string, string> = {
    'no-groups': 'No groups yet',
    'no-expenses': 'No expenses yet',
    'all-settled': 'All settled up!'
  };

  const subtitles: Record<string, string> = {
    'no-groups': 'Create your first group to start splitting',
    'no-expenses': 'Add an expense to get the party started',
    'all-settled': 'Everyone is square — freedom! 🎉'
  };
</script>

<div class="empty-state">
  <div class="empty-illustration" class:floating={true}>
    {#if variant === 'no-groups'}
      <!-- Wallet / Piggy bank outline -->
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- Wallet body -->
        <rect x="10" y="28" width="60" height="38" rx="8" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        <!-- Wallet flap -->
        <path d="M10 36 L10 28 Q10 22 16 22 L64 22 Q70 22 70 28 L70 36" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        <!-- Bill peeking out -->
        <rect x="20" y="14" width="40" height="16" rx="3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="4 3"/>
        <!-- Coin slots on wallet -->
        <circle cx="28" cy="46" r="4" stroke="currentColor" stroke-width="2"/>
        <circle cx="40" cy="46" r="4" stroke="currentColor" stroke-width="2"/>
        <circle cx="52" cy="46" r="4" stroke="currentColor" stroke-width="2"/>
      </svg>
    {:else if variant === 'no-expenses'}
      <!-- Receipt outline -->
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- Receipt paper -->
        <path d="M20 12 L60 12 L60 68 Q60 72 56 72 L24 72 Q20 72 20 68 Z" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        <!-- Torn bottom edge -->
        <path d="M20 72 L24 68 L28 72 L32 68 L36 72 L40 68 L44 72 L48 68 L52 72 L56 68 L56 72" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <!-- Receipt lines -->
        <line x1="28" y1="24" x2="52" y2="24" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <line x1="28" y1="32" x2="52" y2="32" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <line x1="28" y1="40" x2="44" y2="40" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <line x1="28" y1="48" x2="52" y2="48" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <!-- Total circle -->
        <circle cx="48" cy="60" r="7" stroke="currentColor" stroke-width="2"/>
        <line x1="44" y1="60" x2="52" y2="60" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    {:else}
      <!-- Handshake / checkmark outline -->
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- Circular background -->
        <circle cx="40" cy="40" r="30" stroke="currentColor" stroke-width="2.5" opacity="0.3"/>
        <!-- Checkmark -->
        <path d="M24 40 L35 51 L56 30" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
        <!-- Small sparkles -->
        <path d="M20 22 L22 18 L24 22 L20 20 Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M56 58 L58 54 L60 58 L56 56 Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    {/if}
  </div>

  <p class="empty-title">{title || titles[variant]}</p>
  {#if subtitle}
    <p class="empty-subtitle">{subtitle}</p>
  {/if}
</div>

<style>
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 48px 24px;
    user-select: none;
  }

  .empty-illustration {
    color: var(--text3);
    margin-bottom: 20px;
  }

  .floating {
    animation: floatY 3s ease-in-out infinite;
  }

  @keyframes floatY {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }

  .empty-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--text2);
    margin: 0 0 8px;
  }

  .empty-subtitle {
    font-size: 12px;
    color: var(--text3);
    margin: 0;
    max-width: 220px;
    line-height: 1.5;
  }
</style>

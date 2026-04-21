<script lang="ts">
  import { t, getSystemLocale } from '$lib/i18n/index.js';
  let { data } = $props();

  const fmt = (n: number) => new Intl.NumberFormat(getSystemLocale(), { style: 'currency', currency: data.userBaseCurrency || 'EUR' }).format(n);

  // Pull-to-refresh state
  let pullDist = $state(0);
  let isPulling = $state(false);
  let isRefreshing = $state(false);
  let touchStartY = 0;
  let containerEl: HTMLElement | null = null;

  function onTouchStart(e: TouchEvent) {
    if (containerEl && containerEl.scrollTop <= 0) {
      touchStartY = e.touches[0].clientY;
      isPulling = true;
    }
  }
  function onTouchMove(e: TouchEvent) {
    if (!isPulling) return;
    const dy = e.touches[0].clientY - touchStartY;
    if (dy > 0) {
      pullDist = Math.min(dy * 0.5, 80);
      e.preventDefault();
    }
  }
  function onTouchEnd() {
    if (isPulling) {
      if (pullDist > 50) {
        isRefreshing = true;
        window.location.reload();
      }
      pullDist = 0;
      isPulling = false;
    }
  }
</script>

<svelte:head>
  <title>Splitrr</title>
</svelte:head>

<!-- Pull-to-refresh indicator -->
<div style="position:fixed;top:calc(56px + env(safe-area-inset-top));left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:center;height:{isRefreshing ? 50 : pullDist}px;opacity:{isRefreshing || pullDist > 10 ? 1 : 0};transition:{isRefreshing ? 'height 0.3s,opacity 0.3s' : 'height 0.1s,opacity 0.2s'};pointer-events:none;">
  <div style="color:var(--gold);font-size:12px;letter-spacing:0.1em;">
    {isRefreshing ? '↻ Refreshing...' : pullDist > 10 ? '↓ Pull to refresh' : ''}
  </div>
</div>

<div bind:this={containerEl} ontouchstart={onTouchStart} ontouchmove={onTouchMove} ontouchend={onTouchEnd} style="min-height:100%;">
{#key data.refresh}
{#if data.self && data.dashboard}
  {@const d = data.dashboard}

  <!-- Balance Header -->
  <div class="glass-card-static" style="text-align: center; padding: 20px; margin-bottom: 16px;">
    <div style="font-size: 11px; color: var(--text3); letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 8px;">{t('total_balance')}</div>
    <div class="stat-value" style="font-size: 30px;" class:text-green={d.netBalance > 0} class:text-red={d.netBalance < 0}>
      {d.netBalance >= 0 ? '+' : ''}{fmt(d.netBalance)}
    </div>
    <div style="display: flex; justify-content: center; gap: 24px; margin-top: 12px;">
      <div>
        <div style="font-size: 11px; color: var(--text3); letter-spacing: 0.1em; text-transform: uppercase;">{t('they_owe_you')}</div>
        <div style="font-family: 'Libre Baskerville', Georgia, serif; font-size: 16px; font-weight: 700; color: var(--green);">{fmt(d.totalOwed)}</div>
      </div>
      <div style="width: 1px; background: var(--border);"></div>
      <div>
        <div style="font-size: 11px; color: var(--text3); letter-spacing: 0.1em; text-transform: uppercase;">{t('you_owe')}</div>
        <div style="font-family: 'Libre Baskerville', Georgia, serif; font-size: 16px; font-weight: 700; color: var(--red);">{fmt(d.totalOwe)}</div>
      </div>
    </div>
    <div style="font-size: 8px; color: var(--text3); margin-top: 8px;">{t('currency')}: {data.userBaseCurrency || 'EUR'}</div>
  </div>

  <!-- Groups -->
  <div class="section-header">{t('groups')}</div>
  {#each d.groups as g}
    <a href="/groups/{g.id}" style="text-decoration: none; display: block;">
      <div class="glass-card card-interactive" style="display: flex; align-items: center; gap: 12px; padding: 12px 14px; margin-bottom: 14px;">
        <div class="emoji-icon" style="font-size: 24px;">{g.emoji}</div>
        <div style="flex: 1;">
          <div style="font-size: 12px; font-weight: 500;">{g.name}</div>
          <div style="font-size: 11px; color: var(--text3);">{t('members_count', { count: g.member_count, count2: g.expense_count })}</div>
        </div>
        <div style="font-family: 'Libre Baskerville', Georgia, serif; font-weight: 600; font-size: 13px;" class:text-green={g.balance > 0} class:text-red={g.balance < 0}>
          {g.balance >= 0 ? '+' : ''}{fmt(g.balance)}
        </div>
      </div>
    </a>
  {/each}

{:else}
  <div style="text-align: center; padding: 60px 20px;">
    <div style="font-size: 48px; margin-bottom: 16px;">👋</div>
    <div style="font-size: 14px; font-weight: 500; margin-bottom: 8px;">{t('welcome')}</div>
    <div style="font-size: 12px; color: var(--text3); margin-bottom: 20px;">{t('get_started')}</div>
    <a href="/groups/new"><button class="btn-gold">{t('create_group')}</button></a>
  </div>
{/if}
{/key}
</div>

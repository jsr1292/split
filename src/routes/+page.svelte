<script lang="ts">
  import { t, getLocale } from '$lib/i18n/index.js';
  let { data } = $props();

  const fmt = (n: number) => new Intl.NumberFormat(getLocale(), { style: 'currency', currency: data.userBaseCurrency || 'EUR' }).format(n);
</script>

<svelte:head>
  <title>Split</title>
</svelte:head>

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

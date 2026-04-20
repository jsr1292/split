<script lang="ts">
  let { data } = $props();

  const categories: Record<string, string> = {
    food: '🍕', transport: '🚗', accommodation: '🏠', activities: '🎯',
    drinks: '🍺', shopping: '🛍️', utilities: '💡', health: '💊', other: '📌'
  };

  function fmt(n: number) {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
  }
</script>

<svelte:head>
  <title>Split — Dashboard</title>
</svelte:head>

{#if data.dashboard}
  {@const dash = data.dashboard}

  <!-- Balance Summary -->
  <div class="glass-card-static" style="margin-bottom: 12px; text-align: center; padding: 20px;">
    <div class="stat-label" style="margin-bottom: 8px;">Balance neto</div>
    <div class="stat-value" style="font-size: 32px;" class:text-green={dash.netBalance > 0} class:text-red={dash.netBalance < 0}>
      {dash.netBalance > 0 ? '+' : ''}{fmt(dash.netBalance)}
    </div>
    <div class="gold-divider"></div>
    <div style="display: flex; justify-content: center; gap: 32px;">
      <div>
        <div class="text-green" style="font-size: 14px; font-weight: 700;">{fmt(dash.totalOwed)}</div>
        <div class="stat-label">Te deben</div>
      </div>
      <div>
        <div class="text-red" style="font-size: 14px; font-weight: 700;">{fmt(dash.totalOwe)}</div>
        <div class="stat-label">Tú debes</div>
      </div>
    </div>
  </div>

  <!-- Groups -->
  <div style="margin-bottom: 16px;">
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
      <div class="section-header" style="margin-bottom: 0; border-bottom: none; padding-bottom: 0;">Grupos</div>
      <a href="/groups/new" style="font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase;">+ Nuevo</a>
    </div>

    {#each dash.groups as group}
      <a href="/groups/{group.id}">
        <div class="glass-card" style="display: flex; align-items: center; gap: 12px;">
          <div style="font-size: 24px; width: 36px; text-align: center; flex-shrink: 0;">{group.emoji}</div>
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 600; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{group.name}</div>
            <div style="font-size: 9px; color: var(--text3); letter-spacing: 0.05em; margin-top: 2px;">{group.member_count} personas · {group.expense_count} gastos</div>
          </div>
          <div style="font-weight: 700; font-size: 12px; font-family: 'Libre Baskerville', Georgia, serif;" class:text-green={group.balance > 0} class:text-red={group.balance < 0}>
            {group.balance > 0 ? '+' : ''}{fmt(group.balance)}
          </div>
        </div>
      </a>
    {/each}
  </div>

  <!-- Recent Activity -->
  <div>
    <div class="section-header">Actividad reciente</div>

    {#each dash.recentExpenses as exp}
      <a href="/expense/{exp.id}">
        <div class="glass-card" style="display: flex; align-items: center; gap: 12px; padding: 10px 14px;">
          <div style="font-size: 18px; width: 28px; text-align: center; flex-shrink: 0;">{categories[exp.category] || '📌'}</div>
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 500; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{exp.description}</div>
            <div style="font-size: 9px; color: var(--text3); letter-spacing: 0.05em; margin-top: 1px;">{exp.group_emoji} {exp.group_name} · pagó {exp.paid_by_name}</div>
          </div>
          <div style="font-weight: 600; font-size: 12px; font-family: 'Libre Baskerville', Georgia, serif;">{fmt(exp.amount)}</div>
        </div>
      </a>
    {/each}
  </div>

  <!-- FAB -->
  <a href="/expense/new">
    <button class="btn-fab">+</button>
  </a>
{:else}
  <div style="text-align: center; padding: 60px 20px;">
    <div style="font-size: 48px; margin-bottom: 16px;">💰</div>
    <p class="text-muted">No data yet</p>
  </div>
{/if}

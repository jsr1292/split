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

  <!-- Balance Cards -->
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 20px;">
    <div class="glass-card" style="text-align: center;">
      <div class="text-xs text-muted" style="margin-bottom: 4px;">Te deben</div>
      <div class="text-green font-bold" style="font-size: 22px;">{fmt(dash.totalOwed)}</div>
    </div>
    <div class="glass-card" style="text-align: center;">
      <div class="text-xs text-muted" style="margin-bottom: 4px;">Tú debes</div>
      <div class="text-red font-bold" style="font-size: 22px;">{fmt(dash.totalOwe)}</div>
    </div>
  </div>

  <!-- Net Balance -->
  <div class="glass-card" style="text-align: center; margin-bottom: 20px;">
    <div class="text-xs text-muted" style="margin-bottom: 4px;">Balance neto</div>
    <div class="font-bold" style="font-size: 28px;" class:text-green={dash.netBalance > 0} class:text-red={dash.netBalance < 0}>
      {dash.netBalance > 0 ? '+' : ''}{fmt(dash.netBalance)}
    </div>
  </div>

  <!-- Groups -->
  <div style="margin-bottom: 20px;">
    <div class="flex items-center justify-between mb-2">
      <h2 style="font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text3);">Grupos</h2>
      <a href="/groups/new" class="text-xs text-gold">+ Nuevo</a>
    </div>

    {#each dash.groups as group}
      <a href="/groups/{group.id}" style="text-decoration: none; color: inherit;">
        <div class="glass-card" style="display: flex; align-items: center; gap: 12px; cursor: pointer;">
          <div style="font-size: 28px; width: 40px; text-align: center;">{group.emoji}</div>
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 600; font-size: 14px;" class="truncate">{group.name}</div>
            <div class="text-xs text-muted">{group.member_count} personas · {group.expense_count} gastos</div>
          </div>
          <div class="font-bold text-sm" class:text-green={group.balance > 0} class:text-red={group.balance < 0}>
            {group.balance > 0 ? '+' : ''}{fmt(group.balance)}
          </div>
        </div>
      </a>
    {/each}
  </div>

  <!-- Recent Activity -->
  <div>
    <h2 style="font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text3); margin-bottom: 8px;">Actividad reciente</h2>

    {#each dash.recentExpenses as exp}
      <a href="/expense/{exp.id}" style="text-decoration: none; color: inherit;">
        <div class="glass-card" style="display: flex; align-items: center; gap: 12px; padding: 12px 16px;">
          <div style="font-size: 20px; width: 32px; text-align: center;">{categories[exp.category] || '📌'}</div>
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 500; font-size: 13px;" class="truncate">{exp.description}</div>
            <div class="text-xs text-muted">{exp.group_emoji} {exp.group_name} · {exp.paid_by_name}</div>
          </div>
          <div class="font-bold text-sm">{fmt(exp.amount)}</div>
        </div>
      </a>
    {/each}
  </div>
{:else}
  <div style="text-align: center; padding: 60px 20px;">
    <div style="font-size: 48px; margin-bottom: 16px;">💰</div>
    <p class="text-muted">No data yet</p>
  </div>
{/if}

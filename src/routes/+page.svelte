<script lang="ts">
  let { data } = $props();

  const categoryEmojis: Record<string, string> = {
    food: '🍕', transport: '🚗', accommodation: '🏠', activities: '🎯',
    drinks: '🍺', shopping: '🛍️', utilities: '💡', health: '💊', other: '📌'
  };
  const categoryLabels: Record<string, string> = {
    food: 'Comida', transport: 'Transporte', accommodation: 'Alojamiento', activities: 'Actividades',
    drinks: 'Copas', shopping: 'Compras', utilities: 'Servicios', health: 'Salud', other: 'Otro'
  };

  function fmt(n: number) {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
  }

  // Search
  let searchQuery = $state('');
  let searchResults: any[] = $state([]);
  let searching = $state(false);

  async function onSearch() {
    if (searchQuery.length < 2) { searchResults = []; return; }
    searching = true;
    const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
    if (res.ok) searchResults = await res.json();
    searching = false;
  }

  $effect(() => { onSearch(); });
</script>

<svelte:head>
  <title>Split</title>
</svelte:head>

{#if data.self && data.dashboard}
  {@const d = data.dashboard}

  <!-- Balance Header -->
  <div class="glass-card-static" style="text-align: center; padding: 20px; margin-bottom: 16px;">
    <div style="font-size: 9px; color: var(--text3); letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 8px;">Balance total</div>
    <div class="stat-value" style="font-size: 30px;" class:text-green={d.netBalance > 0} class:text-red={d.netBalance < 0}>
      {d.netBalance >= 0 ? '+' : ''}{fmt(d.netBalance)}
    </div>
    <div style="display: flex; justify-content: center; gap: 24px; margin-top: 12px;">
      <div>
        <div style="font-size: 9px; color: var(--text3); letter-spacing: 0.1em; text-transform: uppercase;">Te deben</div>
        <div style="font-family: 'Libre Baskerville', Georgia, serif; font-size: 16px; font-weight: 700; color: var(--green);">{fmt(d.totalOwed)}</div>
      </div>
      <div style="width: 1px; background: var(--border);"></div>
      <div>
        <div style="font-size: 9px; color: var(--text3); letter-spacing: 0.1em; text-transform: uppercase;">Debes</div>
        <div style="font-family: 'Libre Baskerville', Georgia, serif; font-size: 16px; font-weight: 700; color: var(--red);">{fmt(d.totalOwe)}</div>
      </div>
    </div>
  </div>

  <!-- Search -->
  <div class="form-group" style="margin-bottom: 16px;">
    <input type="text" placeholder="🔍 Buscar gastos..." bind:value={searchQuery} style="padding: 10px 14px;" />
  </div>

  {#if searchResults.length > 0}
    <div class="section-header">Resultados</div>
    {#each searchResults as exp}
      <a href="/expense/{exp.id}">
        <div class="glass-card" style="display: flex; align-items: center; gap: 10px; padding: 10px 14px;">
          <div style="font-size: 18px;">{categoryEmojis[exp.category] || '📌'}</div>
          <div style="flex: 1; min-width: 0;">
            <div style="font-size: 12px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{exp.description}</div>
            <div style="font-size: 9px; color: var(--text3);">{exp.group_emoji} {exp.group_name}</div>
          </div>
          <div style="font-family: 'Libre Baskerville', Georgia, serif; font-weight: 600; font-size: 13px;">{fmt(exp.amount)}</div>
        </div>
      </a>
    {/each}
  {:else if !searchQuery}
    <!-- Category Breakdown -->
    {#if data.categories.length > 0}
      <div class="section-header">Por categoría</div>
      <div style="display: flex; gap: 0; flex-wrap: wrap; margin-bottom: 16px;">
        {#each data.categories as cat}
          <div class="glass-card-static" style="flex: 1; min-width: 80px; text-align: center; padding: 10px 6px; margin: 3px;">
            <div style="font-size: 18px; margin-bottom: 2px;">{categoryEmojis[cat.category] || '📌'}</div>
            <div style="font-family: 'Libre Baskerville', Georgia, serif; font-size: 11px; font-weight: 700; color: var(--gold);">{fmt(cat.total)}</div>
            <div style="font-size: 8px; color: var(--text3); margin-top: 1px;">{cat.count} gasto{cat.count !== 1 ? 's' : ''}</div>
          </div>
        {/each}
      </div>
    {/if}

    <!-- Groups -->
    <div class="section-header">Grupos</div>
    {#each d.groups as g}
      <a href="/groups/{g.id}">
        <div class="glass-card" style="display: flex; align-items: center; gap: 12px; padding: 12px 14px;">
          <div style="font-size: 24px;">{g.emoji}</div>
          <div style="flex: 1;">
            <div style="font-size: 12px; font-weight: 500;">{g.name}</div>
            <div style="font-size: 9px; color: var(--text3);">{g.member_count} personas · {g.expense_count} gastos</div>
          </div>
          <div style="font-family: 'Libre Baskerville', Georgia, serif; font-weight: 600; font-size: 13px;" class:text-green={g.balance > 0} class:text-red={g.balance < 0}>
            {g.balance >= 0 ? '+' : ''}{fmt(g.balance)}
          </div>
        </div>
      </a>
    {/each}

    <!-- Recent Expenses -->
    {#if d.recentExpenses.length > 0}
      <div class="section-header" style="margin-top: 16px;">Actividad reciente</div>
      {#each d.recentExpenses as exp}
        <a href="/expense/{exp.id}">
          <div class="glass-card" style="display: flex; align-items: center; gap: 10px; padding: 10px 14px;">
            <div style="font-size: 18px;">{categoryEmojis[exp.category] || '📌'}</div>
            <div style="flex: 1; min-width: 0;">
              <div style="font-size: 12px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{exp.description}</div>
              <div style="font-size: 9px; color: var(--text3);">{exp.group_emoji} {exp.group_name} · {new Date(exp.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</div>
            </div>
            <div style="font-family: 'Libre Baskerville', Georgia, serif; font-weight: 600; font-size: 13px;">{fmt(exp.amount)}</div>
          </div>
        </a>
      {/each}
    {/if}
  {/if}
{:else}
  <div style="text-align: center; padding: 60px 20px;">
    <div style="font-size: 48px; margin-bottom: 16px;">👋</div>
    <div style="font-size: 14px; font-weight: 500; margin-bottom: 8px;">Bienvenido a Split</div>
    <div style="font-size: 12px; color: var(--text3); margin-bottom: 20px;">Empieza creando un grupo</div>
    <a href="/groups/new"><button class="btn-gold">Crear grupo</button></a>
  </div>
{/if}

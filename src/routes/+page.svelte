<script lang="ts">
  let { data } = $props();

  function fmt(n: number) {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: data.userBaseCurrency || 'EUR' }).format(n);
  }
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
    <div style="font-size: 8px; color: var(--text3); margin-top: 8px;">Moneda: {data.userBaseCurrency || 'EUR'}</div>
  </div>

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

{:else}
  <div style="text-align: center; padding: 60px 20px;">
    <div style="font-size: 48px; margin-bottom: 16px;">👋</div>
    <div style="font-size: 14px; font-weight: 500; margin-bottom: 8px;">Bienvenido a Split</div>
    <div style="font-size: 12px; color: var(--text3); margin-bottom: 20px;">Empieza creando un grupo</div>
    <a href="/groups/new"><button class="btn-gold">Crear grupo</button></a>
  </div>
{/if}

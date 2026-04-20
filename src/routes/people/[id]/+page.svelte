<script lang="ts">
  let { data } = $props();

  function fmt(n: number) {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
  }

  function balanceLabel(n: number) {
    if (n > 0) return `te debe ${fmt(n)}`;
    if (n < 0) return `le debes ${fmt(Math.abs(n))}`;
    return 'todo liquidado';
  }
</script>

<svelte:head>
  <title>Split — {data.person.name}</title>
</svelte:head>

<div style="margin-bottom: 12px;">
  <a href="/people" style="font-size: 10px; color: var(--text3); letter-spacing: 0.05em; display: inline-flex; align-items: center; gap: 4px;">← Personas</a>
</div>

<div class="glass-card-static" style="text-align: center; padding: 20px; margin-bottom: 16px;">
  <div class="avatar" style="width: 48px; height: 48px; font-size: 20px; margin: 0 auto 8px; background: {data.person.avatar_color};">{data.person.name[0]}</div>
  <div style="font-family: 'Libre Baskerville', Georgia, serif; font-size: 20px; font-weight: 700; color: var(--gold);">{data.person.name}</div>
  <div class="gold-divider" style="margin: 12px auto;"></div>
  <div class="stat-label" style="margin-bottom: 4px;">Balance total</div>
  <div class="stat-value" style="font-size: 24px;" class:text-green={data.totalBalance > 0} class:text-red={data.totalBalance < 0}>
    {data.totalBalance > 0 ? '+' : ''}{fmt(data.totalBalance)}
  </div>
  <div style="font-size: 11px; color: var(--text3); margin-top: 4px;">{balanceLabel(data.totalBalance)}</div>
</div>

{#if data.groupBalances.length > 0}
  <div class="section-header">Grupos compartidos</div>
  {#each data.groupBalances as g}
    <a href="/groups/{g.id}">
      <div class="glass-card" style="display: flex; align-items: center; gap: 12px; padding: 12px 14px;">
        <div style="font-size: 24px;">{g.emoji}</div>
        <div style="flex: 1;">
          <div style="font-size: 12px; font-weight: 500;">{g.name}</div>
          <div style="font-size: 9px; color: var(--text3);">{g.member_count} personas</div>
        </div>
        <div style="font-family: 'Libre Baskerville', Georgia, serif; font-weight: 600; font-size: 13px;" class:text-green={g.balance > 0} class:text-red={g.balance < 0}>
          {g.balance > 0 ? '+' : ''}{fmt(g.balance)}
        </div>
      </div>
    </a>
  {/each}
{:else}
  <div style="text-align: center; padding: 40px 20px; color: var(--text3); font-size: 12px;">
    No compartes ningún grupo con {data.person.name}
  </div>
{/if}

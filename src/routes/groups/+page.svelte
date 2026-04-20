<script lang="ts">
  let { data } = $props();

  function fmt(n: number) {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
  }
</script>

<svelte:head>
  <title>Split — Grupos</title>
</svelte:head>

<div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
  <div class="section-header" style="margin-bottom: 0; border-bottom: none; padding-bottom: 0;">Grupos</div>
  <a href="/groups/new" style="font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase;">+ Nuevo</a>
</div>

{#each data.groups as group}
  <a href="/groups/{group.id}">
    <div class="glass-card" style="display: flex; align-items: center; gap: 12px;">
      <div style="font-size: 28px; width: 40px; text-align: center; flex-shrink: 0;">{group.emoji}</div>
      <div style="flex: 1; min-width: 0;">
        <div style="font-weight: 600; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{group.name}</div>
        <div style="font-size: 9px; color: var(--text3); letter-spacing: 0.05em; margin-top: 2px;">{group.member_count} personas · {group.expense_count} gastos</div>
      </div>
      <div style="font-family: 'Libre Baskerville', Georgia, serif; font-weight: 700; font-size: 12px;" class:text-green={group.balance > 0} class:text-red={group.balance < 0}>
        {group.balance > 0 ? '+' : ''}{fmt(group.balance)}
      </div>
    </div>
  </a>
{/each}

{#if data.groups.length === 0}
  <div style="text-align: center; padding: 40px 20px; color: var(--text3); font-size: 12px;">
    Sin grupos. <a href="/groups/new">Crea uno →</a>
  </div>
{/if}

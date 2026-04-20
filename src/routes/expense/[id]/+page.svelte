<script lang="ts">
  let { data } = $props();

  const categories: Record<string, string> = {
    food: '🍕', transport: '🚗', accommodation: '🏠', activities: '🎯',
    drinks: '🍺', shopping: '🛍️', utilities: '💡', health: '💊', other: '📌'
  };

  function fmt(n: number) {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
  }

  async function deleteExpense() {
    if (!confirm('¿Eliminar este gasto?')) return;
    const res = await fetch(`/api/expenses/${data.expense.id}`, { method: 'DELETE' });
    if (res.ok) {
      window.location.href = `/groups/${data.expense.group_id}`;
    }
  }
</script>

<svelte:head>
  <title>Split — {data.expense?.description || 'Gasto'}</title>
</svelte:head>

{#if data.expense}
  {@const exp = data.expense}

  <div style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
    <a href="/groups/{exp.group_id}" style="font-size: 10px; color: var(--text3); letter-spacing: 0.05em; display: inline-flex; align-items: center; gap: 4px;">
      ← Grupo
    </a>
    <a href="/expense/{exp.id}/edit" style="font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--gold);">✏️ Editar</a>
  </div>

  <!-- Expense Header -->
  <div class="glass-card-static" style="text-align: center; padding: 20px; margin-bottom: 12px;">
    <div style="font-size: 36px; margin-bottom: 8px;">{categories[exp.category] || '📌'}</div>
    <div style="font-family: 'Libre Baskerville', Georgia, serif; font-size: 20px; font-weight: 700; color: var(--gold); margin-bottom: 4px;">{fmt(exp.amount)}</div>
    <div style="font-size: 13px; font-weight: 500; margin-bottom: 4px;">{exp.description}</div>
    <div style="font-size: 9px; color: var(--text3); letter-spacing: 0.1em; text-transform: uppercase;">
      {new Date(exp.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
    </div>
  </div>

  <!-- Who paid -->
  <div style="margin-bottom: 16px;">
    <div class="section-header">Pagado por</div>
    <div class="glass-card-static" style="display: flex; align-items: center; gap: 10px;">
      <div class="avatar" style="background: {exp.paid_by_color};">{exp.paid_by_name[0]}</div>
      <div style="font-weight: 600; font-size: 13px;">{exp.paid_by_name}</div>
      <div style="margin-left: auto; font-family: 'Libre Baskerville', Georgia, serif; font-weight: 700; font-size: 14px; color: var(--gold);">{fmt(exp.amount)}</div>
    </div>
  </div>

  <!-- Split breakdown -->
  <div style="margin-bottom: 16px;">
    <div class="section-header">Reparto ({exp.split_type === 'equal' ? 'a partes iguales' : exp.split_type})</div>
    {#each data.splits as split}
      <div class="glass-card-static" style="display: flex; align-items: center; gap: 10px; padding: 10px 14px;">
        <div class="avatar" style="background: {split.user_color}; width: 24px; height: 24px; font-size: 10px;">{split.user_name[0]}</div>
        <div style="font-size: 12px; font-weight: 500;">{split.user_name}</div>
        <div style="margin-left: auto; font-family: 'Libre Baskerville', Georgia, serif; font-size: 13px; font-weight: 600;">
          {fmt(split.share)}
        </div>
      </div>
    {/each}
  </div>

  <!-- Note -->
  {#if exp.note}
    <div style="margin-bottom: 16px;">
      <div class="section-header">Nota</div>
      <div class="glass-card-static" style="font-size: 12px; color: var(--text2);">{exp.note}</div>
    </div>
  {/if}

  <!-- Delete -->
  <div style="text-align: center; margin-top: 20px;">
    <button class="btn-ghost" style="color: var(--red); border-color: rgba(255,77,106,0.3);" onclick={deleteExpense}>
      Eliminar gasto
    </button>
  </div>
{:else}
  <div style="text-align: center; padding: 60px 20px;">
    <div style="font-size: 48px; margin-bottom: 16px;">🤷</div>
    <p class="text-muted">Gasto no encontrado</p>
    <a href="/" style="margin-top: 12px; display: inline-block;">← Volver</a>
  </div>
{/if}

<script lang="ts">
  let { data } = $props();

  const categories: Record<string, string> = {
    food: '🍕', transport: '🚗', accommodation: '🏠', activities: '🎯',
    drinks: '🍺', shopping: '🛍️', utilities: '💡', health: '💊', other: '📌'
  };

  function fmt(n: number) {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
  }

  function balanceLabel(n: number) {
    if (n > 0) return `+${fmt(n)}`;
    if (n < 0) return `−${fmt(Math.abs(n))}`;
    return '€0.00';
  }
</script>

<svelte:head>
  <title>Split — {data.group?.name || 'Grupo'}</title>
</svelte:head>

{#if data.group}
  {@const g = data.group}

  <!-- Back link -->
  <div style="margin-bottom: 12px;">
    <a href="/" style="font-size: 10px; color: var(--text3); letter-spacing: 0.05em; display: inline-flex; align-items: center; gap: 4px;">
      ← Grupos
    </a>
  </div>

  <!-- Group Header -->
  <div class="glass-card-static" style="text-align: center; padding: 20px; margin-bottom: 12px;">
    <div style="font-size: 36px; margin-bottom: 6px;">{g.emoji}</div>
    <div style="font-family: 'Libre Baskerville', Georgia, serif; font-size: 20px; font-weight: 700; color: var(--gold); margin-bottom: 4px;">{g.name}</div>
    <div style="font-size: 9px; color: var(--text3); letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 12px;">{data.members.length} personas · {data.expenses.length} gastos</div>
    <div class="gold-divider"></div>
    <div style="margin-top: 12px;">
      <div class="stat-label" style="margin-bottom: 4px;">Tu balance</div>
      <div class="stat-value" style="font-size: 26px;" class:text-green={data.myBalance > 0} class:text-red={data.myBalance < 0}>
        {balanceLabel(data.myBalance)}
      </div>
    </div>
  </div>

  <!-- Members -->
  <div style="margin-bottom: 16px;">
    <div class="section-header">Miembros</div>
    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
      {#each data.members as member}
        <div class="glass-card-static" style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; margin-bottom: 0; flex: 1; min-width: 140px;">
          <div class="avatar" style="background: {member.avatar_color};">{member.name[0]}</div>
          <div>
            <div style="font-size: 12px; font-weight: 600;">{member.name} {member.is_self ? '(tú)' : ''}</div>
          </div>
        </div>
      {/each}
    </div>
  </div>

  <!-- Balances (who owes whom) -->
  {#if data.balances.length > 0}
    <div style="margin-bottom: 16px;">
      <div class="section-header">Saldos pendientes</div>
      {#each data.balances as b}
        <div class="glass-card" style="display: flex; align-items: center; gap: 10px; padding: 10px 14px;">
          <div style="flex: 1; min-width: 0;">
            <div style="font-size: 12px; font-weight: 500;">
              <span class:text-red={b.from_user === data.self?.id}>{b.from_name}</span>
              <span style="color: var(--text3); font-size: 10px;"> debe </span>
              <span class:text-green={b.to_user === data.self?.id}>{b.to_name}</span>
            </div>
          </div>
          <div style="font-family: 'Libre Baskerville', Georgia, serif; font-weight: 700; font-size: 14px;" class:text-green={b.to_user === data.self?.id} class:text-red={b.from_user === data.self?.id}>
            {fmt(b.amount)}
          </div>
        </div>
      {/each}

      <!-- Settle Up Button -->
      <div style="text-align: center; margin-top: 12px;">
        <button class="btn-gold" style="font-size: 9px; padding: 10px 24px;">Liquidar deudas</button>
      </div>
    </div>
  {/if}

  <!-- Expenses -->
  <div>
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
      <div class="section-header" style="margin-bottom: 0; border-bottom: none; padding-bottom: 0;">Gastos</div>
      <a href="/expense/new?group={g.id}" style="font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase;">+ Añadir</a>
    </div>

    {#each data.expenses as exp}
      <a href="/expense/{exp.id}">
        <div class="glass-card" style="display: flex; align-items: center; gap: 12px; padding: 10px 14px;">
          <div style="font-size: 20px; width: 30px; text-align: center; flex-shrink: 0;">{categories[exp.category] || '📌'}</div>
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 500; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{exp.description}</div>
            <div style="font-size: 9px; color: var(--text3); letter-spacing: 0.05em; margin-top: 1px;">
              {new Date(exp.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} · pagó {exp.paid_by_name}
            </div>
          </div>
          <div style="font-family: 'Libre Baskerville', Georgia, serif; font-weight: 600; font-size: 13px;">{fmt(exp.amount)}</div>
        </div>
      </a>
    {/each}

    {#if data.expenses.length === 0}
      <div style="text-align: center; padding: 30px 20px; color: var(--text3); font-size: 12px;">
        Sin gastos aún. <a href="/expense/new?group={g.id}">Añadir el primero →</a>
      </div>
    {/if}
  </div>

  <!-- Settlements -->
  {#if data.settlements.length > 0}
    <div style="margin-top: 16px;">
      <div class="section-header">Liquidaciones</div>
      {#each data.settlements as s}
        <div class="glass-card" style="display: flex; align-items: center; gap: 10px; padding: 10px 14px;">
          <div style="font-size: 16px;">💸</div>
          <div style="flex: 1;">
            <div style="font-size: 12px;"><span style="font-weight: 600;">{s.from_name}</span> → <span style="font-weight: 600;">{s.to_name}</span></div>
            <div style="font-size: 9px; color: var(--text3);">{new Date(s.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</div>
          </div>
          <div style="font-family: 'Libre Baskerville', Georgia, serif; font-weight: 600; font-size: 13px; color: var(--green);">{fmt(s.amount)}</div>
        </div>
      {/each}
    </div>
  {/if}

{:else}
  <div style="text-align: center; padding: 60px 20px;">
    <div style="font-size: 48px; margin-bottom: 16px;">🤷</div>
    <p class="text-muted">Grupo no encontrado</p>
    <a href="/" style="margin-top: 12px; display: inline-block;">← Volver</a>
  </div>
{/if}

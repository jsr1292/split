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

  // Settle up state
  let showSettle = $state(false);
  let settling = $state(false);

  // Simplify balances into minimum transactions (greedy algorithm)
  function simplifyBalances(balances: any[]) {
    // Net amount per user: positive = owed money, negative = owes money
    const net: Record<string, { name: string; amount: number }> = {};
    for (const b of balances) {
      if (!net[b.from_user]) net[b.from_user] = { name: b.from_name, amount: 0 };
      if (!net[b.to_user]) net[b.to_user] = { name: b.to_name, amount: 0 };
      net[b.from_user].amount -= b.amount;
      net[b.to_user].amount += b.amount;
    }

    const debtors = Object.entries(net)
      .filter(([_, v]) => v.amount < -0.01)
      .map(([id, v]) => ({ id, name: v.name, amount: -v.amount }))
      .sort((a, b) => b.amount - a.amount);

    const creditors = Object.entries(net)
      .filter(([_, v]) => v.amount > 0.01)
      .map(([id, v]) => ({ id, name: v.name, amount: v.amount }))
      .sort((a, b) => b.amount - a.amount);

    const transactions: { from: string; fromName: string; to: string; toName: string; amount: number }[] = [];

    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      const amount = Math.min(debtors[i].amount, creditors[j].amount);
      if (amount > 0.01) {
        transactions.push({
          from: debtors[i].id, fromName: debtors[i].name,
          to: creditors[j].id, toName: creditors[j].name,
          amount: Math.round(amount * 100) / 100
        });
      }
      debtors[i].amount -= amount;
      creditors[j].amount -= amount;
      if (debtors[i].amount < 0.01) i++;
      if (creditors[j].amount < 0.01) j++;
    }

    return transactions;
  }

  let suggestedSettlements = $state(simplifyBalances(data.balances));
  let editedAmounts = $state<Record<number, string>>({});

  function getEditedAmount(i: number, original: number) {
    const edited = editedAmounts[i];
    if (edited !== undefined) {
      const parsed = parseFloat(edited.replace(',', '.'));
      return isNaN(parsed) ? original : parsed;
    }
    return original;
  }
  let totalToSettle = $derived(suggestedSettlements.reduce((sum, s, i) => sum + getEditedAmount(i, s.amount), 0));
  let totalCatAmount = $derived(data.categories.reduce((s: number, c: any) => s + c.total, 0));

  async function confirmSettle() {
    settling = true;
    const today = new Date().toISOString().split('T')[0];
    try {
      for (const [i, s] of suggestedSettlements.entries()) {
        const amount = getEditedAmount(i, s.amount);
        if (amount > 0.001) {
          await fetch('/api/settle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              groupId: data.group.id,
              fromUser: s.from,
              toUser: s.to,
              amount,
              date: today
            })
          });
        }
      }
      window.location.reload();
    } catch {
      alert('Error al liquidar');
    } finally {
      settling = false;
    }
  }
</script>

<svelte:head>
  <title>Split — {data.group?.name || 'Grupo'}</title>
</svelte:head>

{#if data.group}
  {@const g = data.group}

  <!-- Back link -->
  <div style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
    <a href="/" style="font-size: 10px; color: var(--text3); letter-spacing: 0.05em; display: inline-flex; align-items: center; gap: 4px;">
      ← Grupos
    </a>
    <a href="/groups/{g.id}/edit" style="font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--gold);">✏️ Editar</a>
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

  <!-- Category Breakdown -->
  {#if data.categories.length > 0}
    <div style="margin-bottom: 16px;">
      <div class="section-header">Por categoría</div>
      <div style="display: flex; gap: 0; flex-wrap: wrap; margin-bottom: 12px;">
        {#each data.categories as cat}
          <div class="glass-card-static" style="flex: 1; min-width: 70px; text-align: center; padding: 8px 4px; margin: 3px;">
            <div style="font-size: 16px; margin-bottom: 1px;">{categories[cat.category] || '📌'}</div>
            <div style="font-family: 'Libre Baskerville', Georgia, serif; font-size: 10px; font-weight: 700; color: var(--gold);">{fmt(cat.total)}</div>
            <div style="font-size: 7px; color: var(--text3);">{cat.count} gasto{cat.count !== 1 ? 's' : ''}</div>
          </div>
        {/each}
      </div>
      <!-- Horizontal Bar Chart -->
      <div style="display: flex; flex-direction: column; gap: 6px;">
        {#each data.categories as cat}
          {@const pct = Math.round((cat.total / totalCatAmount) * 100)}
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="font-size: 14px; width: 20px; text-align: center; flex-shrink: 0;">{categories[cat.category] || '📌'}</div>
            <div style="flex: 1; height: 8px; background: rgba(255,255,255,0.05); border-radius: 4px; overflow: hidden;">
              <div style="height: 100%; width: {pct}%; background: linear-gradient(90deg, var(--gold), rgba(201,168,76,0.6)); border-radius: 4px; transition: width 0.3s ease;"></div>
            </div>
            <div style="font-family: 'Libre Baskerville', Georgia, serif; font-size: 10px; font-weight: 700; color: var(--gold); min-width: 32px; text-align: right;">{pct}%</div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

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
              <span style="color: var(--text3); font-size: 10px;"> le debe a </span>
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
        <button class="btn-gold" style="font-size: 9px; padding: 10px 24px;" onclick={() => showSettle = true}>Liquidar deudas</button>
      </div>
    </div>
  {/if}

  <!-- Settle Up Panel -->
  {#if showSettle && suggestedSettlements.length > 0}
    <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 200; display: flex; align-items: flex-end; justify-content: center;" onclick={() => showSettle = false}>
      <div style="background: var(--bg2); border-top: 1px solid var(--glass-border); border-radius: 16px 16px 0 0; width: 100%; max-width: 500px; max-height: 70vh; overflow-y: auto; padding: 20px;" onclick={(e) => e.stopPropagation()}>
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
          <div style="font-family: 'Libre Baskerville', Georgia, serif; font-size: 16px; font-weight: 700; color: var(--gold);">Liquidar deudas</div>
          <button onclick={() => showSettle = false} style="background: none; border: none; color: var(--text3); font-size: 18px; cursor: pointer;">✕</button>
        </div>
        <div style="font-size: 11px; color: var(--text3); margin-bottom: 16px;">
          Transacciones mínimas para saldar todas las deudas:
        </div>

        {#each suggestedSettlements as s, i}
          <div class="glass-card-static" style="display: flex; align-items: center; gap: 8px; padding: 10px 12px;">
            <div style="font-size: 16px; width: 24px; text-align: center; flex-shrink: 0;">💸</div>
            <div style="flex: 1; min-width: 0;">
              <div style="font-size: 11px;">
                <span style="font-weight: 600;" class:text-red={s.from === data.self?.id}>{s.fromName}</span>
                <span style="color: var(--text3);"> → </span>
                <span style="font-weight: 600;" class:text-green={s.to === data.self?.id}>{s.toName}</span>
              </div>
              <div style="font-size: 9px; color: var(--text3);">Máximo: {fmt(s.amount)}</div>
            </div>
            <div style="display: flex; align-items: center; gap: 4px;">
              <span style="color: var(--gold); font-size: 12px;">€</span>
              <input
                type="text"
                inputmode="decimal"
                value={editedAmounts[i] !== undefined ? editedAmounts[i] : s.amount.toFixed(2)}
                oninput={(e) => { editedAmounts[i] = (e.target as HTMLInputElement).value; }}
                style="width: 64px; background: var(--bg); border: 1px solid var(--glass-border); border-radius: 6px; color: var(--gold); font-family: 'Libre Baskerville', Georgia, serif; font-size: 13px; font-weight: 700; padding: 4px 6px; text-align: right;"
              />
            </div>
          </div>
        {/each}

        <div style="margin-top: 12px; padding: 10px 12px; background: rgba(201,168,76,0.08); border: 1px solid rgba(201,168,76,0.2); border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
          <div style="font-size: 11px; color: var(--text3);">Total a liquidar</div>
          <div style="font-family: 'Libre Baskerville', Georgia, serif; font-size: 16px; font-weight: 700; color: var(--gold);">{fmt(totalToSettle)}</div>
        </div>
        <div style="text-align: center; margin-top: 12px;">
          <button class="btn-gold" style="width: 100%; padding: 12px;" onclick={confirmSettle} disabled={settling}>
            {settling ? 'Liquidando...' : 'Liquidar ' + fmt(totalToSettle)}
          </button>
        </div>
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
        Sin gastos aún.
      </div>
    {/if}
  </div>

  <!-- Add Expense Button -->
  <div style="text-align: center; margin-top: 16px;">
    <a href="/expense/new?group={g.id}">
      <button class="btn-gold" style="padding: 12px 32px;">+ Añadir gasto</button>
    </a>
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
          <button onclick={async () => { if (confirm('¿Deshacer esta liquidación?')) { await fetch(`/api/settlements/${s.id}`, { method: 'DELETE' }); window.location.reload(); } }} style="background: none; border: none; color: var(--text3); font-size: 14px; cursor: pointer; padding: 4px;" title="Deshacer">✕</button>
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

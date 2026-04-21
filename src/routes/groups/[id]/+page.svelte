<script lang="ts">
  import { t, getSystemLocale } from '$lib/i18n/index.js';
  let { data } = $props();

  const categoryIcons: Record<string, string> = {
    food: '🍕', transport: '🚗', accommodation: '🏠', activities: '🎯',
    drinks: '🍺', shopping: '🛍️', utilities: '💡', health: '💊', other: '📌'
  };

  function fmt(n: number, curr?: string) {
    const currency = curr || data.group?.currency || 'EUR';
    return new Intl.NumberFormat(getSystemLocale(), { style: 'currency', currency }).format(n);
  }

  function fmtUser(n: number) {
    return new Intl.NumberFormat(getSystemLocale(), { style: 'currency', currency: data.userBaseCurrency || 'EUR' }).format(n);
  }

  function balanceLabel(n: number) {
    if (n > 0) return `+${fmtUser(n)}`;
    if (n < 0) return `−${fmtUser(Math.abs(n))}`;
    return fmtUser(0);
  }

  // Settle up state
  let showSettle = $state(false);
  let settling = $state(false);
  let showInvite = $state(false);
  let inviteLinkCopied = $state(false);

  function copyInviteLink() {
    const link = window.location.origin + '/groups/' + data.group.id + '/join';
    navigator.clipboard.writeText(link).then(() => {
      inviteLinkCopied = true;
      setTimeout(() => inviteLinkCopied = false, 2000);
    });
  }

  // Simplify balances into minimum transactions (greedy algorithm)
  function simplifyBalances(balances: any[]) {
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

  let suggestedSettlements = $state(data.group ? simplifyBalances(data.balances) : []);
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
      alert(t('error'));
    } finally {
      settling = false;
    }
  }
</script>

<svelte:head>
  <title>Split — {data.group?.name || t('groups')}</title>
</svelte:head>

{#if data.group}
  {@const g = data.group}

  <!-- Back link -->
  <div style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
    <a href="/" style="font-size: 12px; color: var(--text3); letter-spacing: 0.05em; display: inline-flex; align-items: center; gap: 4px;">
      ← {t('groups')}
    </a>
    <div style="display: flex; gap: 10px; align-items: center;">
      <button onclick={() => showInvite = true} style="background: none; border: none; color: var(--gold); font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; cursor: pointer;">🔗 {t('invite')}</button>
      <a href="/groups/{g.id}/edit" style="font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--gold);">✏️</a>
    </div>
  </div>

  <!-- Group Header -->
  <div class="glass-card-static" style="text-align: center; padding: 20px; margin-bottom: 12px;">
    <div class="emoji-icon" style="font-size: 36px; margin-bottom: 6px;">{g.emoji}</div>
    <div style="font-family: 'Libre Baskerville', Georgia, serif; font-size: 20px; font-weight: 700; color: var(--gold); margin-bottom: 4px;">{g.name}</div>
    <div style="font-size: 11px; color: var(--text3); letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 4px;">{t('members_count', { count: data.members.length, count2: data.expenses.length })}</div>
    <div style="font-size: 8px; color: var(--text3); letter-spacing: 0.1em; margin-bottom: 12px;">{t('currency')}: {g.currency || 'EUR'}</div>
    <div class="gold-divider"></div>
    <div style="margin-top: 12px;">
      <div class="stat-label" style="margin-bottom: 4px;">{t('your_balance')}</div>
      <div class="stat-value" style="font-size: 26px;" class:text-green={data.myBalance > 0} class:text-red={data.myBalance < 0}>
        {balanceLabel(data.myBalance)}
      </div>
      {#if (g.currency || 'EUR') !== data.userBaseCurrency}
        <div style="font-size: 12px; color: var(--text3); margin-top: 2px;">(≈ {fmt(data.myBalance, g.currency || 'EUR')})</div>
      {/if}
    </div>
  </div>

  <!-- Who Should Pay Next -->
  {#if data.suggestedPayer}
    <div class="glass-card-static" style="display: flex; align-items: center; gap: 10px; padding: 10px 14px; margin-bottom: 12px; background: rgba(201,168,76,0.05); border-color: rgba(201,168,76,0.15);">
      <span class="emoji-icon" style="font-size: 18px;">💡</span>
      <div style="flex: 1;">
        <div style="font-size: 12px; color: var(--text3); letter-spacing: 0.05em;">{t('next_payment')}</div>
        <div style="font-size: 12px; font-weight: 600; color: var(--text2);">
          <span style="width: 20px; height: 20px; border-radius: 50%; background: {data.suggestedPayer.avatar_color}; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: #0a0d14; margin-right: 4px;">{data.suggestedPayer.name[0]}</span>
          {t('should_pay_next', { name: data.suggestedPayer.name })}
        </div>
      </div>
    </div>
  {/if}

  <!-- Category Breakdown -->
  {#if data.categories.length > 0}
    <div style="margin-bottom: 16px;">
      <div class="section-header">{t('by_category')}</div>
      <div style="display: flex; gap: 0; flex-wrap: wrap; margin-bottom: 12px;">
        {#each data.categories as cat}
          <div class="glass-card-static" style="flex: 1; min-width: 70px; text-align: center; padding: 8px 4px; margin: 3px;">
            <div class="emoji-icon" style="font-size: 16px; margin-bottom: 1px;">{categoryIcons[cat.category] || '📌'}</div>
            <div style="font-family: 'Libre Baskerville', Georgia, serif; font-size: 12px; font-weight: 700; color: var(--gold);">{fmt(cat.total)}</div>
            <div style="font-size: 7px; color: var(--text3);">{cat.count} {cat.count !== 1 ? t('expenses') : t('expenses').replace('s','').trim()}</div>
          </div>
        {/each}
      </div>
      <!-- Horizontal Bar Chart -->
      <div style="display: flex; flex-direction: column; gap: 6px;">
        {#each data.categories as cat}
          <div style="display: flex; align-items: center; gap: 8px;">
            <div class="emoji-icon" style="font-size: 14px; width: 20px; text-align: center; flex-shrink: 0;">{categoryIcons[cat.category] || '📌'}</div>
            <div style="flex: 1; height: 8px; background: rgba(255,255,255,0.05); border-radius: 4px; overflow: hidden;">
              <div style="height: 100%; width: {Math.round((cat.total / totalCatAmount) * 100)}%; background: linear-gradient(90deg, var(--gold), rgba(201,168,76,0.6)); border-radius: 4px; transition: width 0.3s ease;"></div>
            </div>
            <div style="font-family: 'Libre Baskerville', Georgia, serif; font-size: 12px; font-weight: 700; color: var(--gold); min-width: 32px; text-align: right;">{Math.round((cat.total / totalCatAmount) * 100)}%</div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Members -->
  <div style="margin-bottom: 16px;">
    <div class="section-header">{t('group_members')}</div>
    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
      {#each data.members as member}
        <div class="glass-card-static" style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; margin-bottom: 0; flex: 1; min-width: 140px;">
          <div class="avatar" style="background: {member.avatar_color};">{member.name[0]}</div>
          <div>
            <div style="font-size: 12px; font-weight: 600;">{member.name} {member.is_self ? t('you') : ''}</div>
          </div>
        </div>
      {/each}
    </div>
  </div>

  <!-- Balances (who owes whom) -->
  {#if data.balances.length > 0}
    <div style="margin-bottom: 16px;">
      <div class="section-header">{t('pending_balances')}</div>
      {#each data.balances as b}
        <div class="glass-card" style="display: flex; align-items: center; gap: 10px; padding: 10px 14px;">
          <div style="flex: 1; min-width: 0;">
            <div style="font-size: 12px; font-weight: 500;">
              <span class:text-red={b.from_user === data.self?.id}>{b.from_name}</span>
              <span style="color: var(--text3); font-size: 12px;"> {t('owed_by')} </span>
              <span class:text-green={b.to_user === data.self?.id}>{b.to_name}</span>
              <span style="font-size: 8px; color: var(--text3);"> ({b.currency || 'EUR'})</span>
            </div>
          </div>
          <div style="font-family: 'Libre Baskerville', Georgia, serif; font-weight: 700; font-size: 14px;" class:text-green={b.to_user === data.self?.id} class:text-red={b.from_user === data.self?.id}>
            {fmt(b.amount, b.currency || 'EUR')}
          </div>
        </div>
      {/each}

      <!-- Settle Up Button -->
      <div style="text-align: center; margin-top: 12px;">
        <button class="btn-gold" style="font-size: 11px; padding: 10px 24px;" onclick={() => showSettle = true}>{t('settle_debts')}</button>
      </div>
    </div>
  {/if}

  <!-- Settle Up Panel -->
  {#if showSettle && suggestedSettlements.length > 0}
    <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 200; display: flex; align-items: flex-end; justify-content: center;" onclick={() => showSettle = false}>
      <div style="background: var(--bg2); border-top: 1px solid var(--glass-border); border-radius: 16px 16px 0 0; width: 100%; max-width: 500px; max-height: 70vh; overflow-y: auto; padding: 20px; padding-bottom: calc(20px + max(env(safe-area-inset-bottom), 8px));" onclick={(e) => e.stopPropagation()}>
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
          <div style="font-family: 'Libre Baskerville', Georgia, serif; font-size: 16px; font-weight: 700; color: var(--gold);">{t('settle_debts')}</div>
          <button onclick={() => showSettle = false} style="background: none; border: none; color: var(--text3); font-size: 18px; cursor: pointer;">✕</button>
        </div>
        <div style="font-size: 11px; color: var(--text3); margin-bottom: 16px;">
          {t('minimum_transactions')}
        </div>

        {#each suggestedSettlements as s, i}
          <div class="glass-card-static" style="display: flex; align-items: center; gap: 8px; padding: 10px 12px;">
            <div class="emoji-icon" style="font-size: 16px; width: 24px; text-align: center; flex-shrink: 0;">💸</div>
            <div style="flex: 1; min-width: 0;">
              <div style="font-size: 11px;">
                <span style="font-weight: 600;" class:text-red={s.from === data.self?.id}>{s.fromName}</span>
                <span style="color: var(--text3);"> → </span>
                <span style="font-weight: 600;" class:text-green={s.to === data.self?.id}>{s.toName}</span>
              </div>
              <div style="font-size: 11px; color: var(--text3);">{t('max')}: {fmt(s.amount)}</div>
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
          <div style="font-size: 11px; color: var(--text3);">{t('total_to_settle')}</div>
          <div style="font-family: 'Libre Baskerville', Georgia, serif; font-size: 16px; font-weight: 700; color: var(--gold);">{fmt(totalToSettle)}</div>
        </div>
        <div style="text-align: center; margin-top: 12px;">
          <button class="btn-gold" style="width: 100%; padding: 12px;" onclick={confirmSettle} disabled={settling}>
            {settling ? t('settling') : t('settle') + ' ' + fmt(totalToSettle)}
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Invite Modal -->
  {#if showInvite}
    <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 200; display: flex; align-items: flex-end; justify-content: center;" onclick={() => showInvite = false}>
      <div style="background: var(--bg2); border-top: 1px solid var(--glass-border); border-radius: 16px 16px 0 0; width: 100%; max-width: 500px; padding: 20px;" onclick={(e) => e.stopPropagation()}>
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
          <div style="font-family: 'Libre Baskerville', Georgia, serif; font-size: 16px; font-weight: 700; color: var(--gold);">{t('invite_to_group')}</div>
          <button onclick={() => showInvite = false} style="background: none; border: none; color: var(--text3); font-size: 18px; cursor: pointer;">✕</button>
        </div>
        <div style="font-size: 12px; color: var(--text3); margin-bottom: 12px;">
          {t('share_link', { group: g.name })}
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <input
            type="text"
            readonly
            value={typeof window !== 'undefined' ? window.location.origin + '/groups/' + g.id + '/join' : '/groups/' + g.id + '/join'}
            style="flex: 1; background: var(--bg); border: 1px solid var(--glass-border); border-radius: 8px; color: var(--text2); font-size: 12px; padding: 10px 12px; font-family: 'JetBrains Mono', monospace;"
          />
          <button onclick={copyInviteLink} style="background: var(--gold); border: none; border-radius: 8px; color: #07090f; font-size: 11px; font-weight: 700; padding: 10px 14px; cursor: pointer; white-space: nowrap;">
            {inviteLinkCopied ? t('copied') : t('copy')}
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Expenses -->
  <div>
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
      <div class="section-header" style="margin-bottom: 0; border-bottom: none; padding-bottom: 0;">{t('expenses')}</div>
      <div style="display: flex; gap: 8px; align-items: center;">
        <a href="/api/groups/{g.id}/export" style="color: var(--text3);" title={t('export')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </a>
        <a href="/expense/new?group={g.id}" style="font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase;">+ {t('add')}</a>
      </div>
    </div>

    {#each data.expenses as exp}
      <a href="/expense/{exp.id}" style="text-decoration: none; display: block;">
        <div class="glass-card card-interactive" style="display: flex; align-items: center; gap: 12px; padding: 10px 14px; margin-bottom: 10px;">
          <div class="emoji-icon" style="font-size: 20px; width: 30px; text-align: center; flex-shrink: 0;">{categoryIcons[exp.category] || '📌'}</div>
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 500; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              {exp.description}
              {#if exp.recurring}
                <span title="{exp.recurring === 'weekly' ? t('weekly') : exp.recurring === 'monthly' ? t('monthly') : t('yearly')}" style="margin-left: 4px; font-size: 12px;">🔄</span>
              {/if}
            </div>
            <div style="font-size: 11px; color: var(--text3); letter-spacing: 0.05em; margin-top: 1px;">
              {new Date(exp.date).toLocaleDateString(getSystemLocale(), { day: 'numeric', month: 'short' })} · {t('paid_by')} {exp.paid_by_name}
              {#if exp.recurring_parent_id}<span style="color: var(--gold-dim);"> ·{t('instance')}</span>{/if}
            </div>
          </div>
          <div style="font-family: 'Libre Baskerville', Georgia, serif; font-weight: 600; font-size: 13px;">{fmt(exp.amount, exp.currency || 'EUR')}</div>
        </div>
      </a>
    {/each}

    {#if data.expenses.length === 0}
      <div style="text-align: center; padding: 30px 20px; color: var(--text3); font-size: 12px;">
        {t('no_expenses')}
      </div>
    {/if}
  </div>

  <!-- Add Expense Button -->
  <div style="text-align: center; margin-top: 16px; margin-bottom: 40px;">
    <a href="/expense/new?group={g.id}">
      <button class="btn-gold" style="padding: 12px 32px;">+ {t('add_expense')}</button>
    </a>
  </div>

  <!-- Settlements -->
  {#if data.settlements.length > 0}
    <div style="margin-top: 16px;">
      <div class="section-header">{t('settlements')}</div>
      {#each data.settlements as s}
        <div class="glass-card" style="display: flex; align-items: center; gap: 10px; padding: 10px 14px;">
          <div class="emoji-icon" style="font-size: 16px;">💸</div>
          <div style="flex: 1;">
            <div style="font-size: 12px;"><span style="font-weight: 600;">{s.from_name}</span> → <span style="font-weight: 600;">{s.to_name}</span></div>
            <div style="font-size: 11px; color: var(--text3);">{new Date(s.date).toLocaleDateString(getSystemLocale(), { day: 'numeric', month: 'short' })}</div>
          </div>
          <div style="font-family: 'Libre Baskerville', Georgia, serif; font-weight: 600; font-size: 13px; color: var(--green);">{fmt(s.amount)}</div>
          <button onclick={async () => { if (confirm(t('confirm_undo'))) { await fetch(`/api/settlements/${s.id}`, { method: 'DELETE' }); window.location.reload(); } }} style="background: none; border: none; color: var(--text3); font-size: 14px; cursor: pointer; padding: 4px;" title={t('undo_settlement')}>✕</button>
        </div>
      {/each}
    </div>
  {/if}

{:else}
  <div style="text-align: center; padding: 60px 20px;">
    <div style="font-size: 48px; margin-bottom: 16px;">🤷</div>
    <p class="text-muted">{t('group_not_found')}</p>
    <a href="/" style="margin-top: 12px; display: inline-block;">{t('go_back')}</a>
  </div>
{/if}

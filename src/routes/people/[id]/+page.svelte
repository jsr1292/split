<script lang="ts">
  import { t, getLocale } from '$lib/i18n/index.js';
  let { data } = $props();

  function fmt(n: number) {
    return new Intl.NumberFormat(getLocale(), { style: 'currency', currency: 'EUR' }).format(n);
  }

  function balanceLabel(n: number) {
    if (n > 0) return `${t('they_owe_you')} ${fmt(n)}`;
    if (n < 0) return `${t('you_owe')} ${fmt(Math.abs(n))}`;
    return t('all_settled');
  }

  let settling = $state(false);

  async function settleUp() {
    if (!confirm(t('confirm_undo'))) return;
    settling = true;
    const today = new Date().toISOString().split('T')[0];
    try {
      for (const g of data.groupBalances) {
        if (Math.abs(g.balance) > 0.01) {
          const from = g.balance > 0 ? data.person.id : data.self.id;
          const to = g.balance > 0 ? data.self.id : data.person.id;
          await fetch('/api/settle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ groupId: g.id, fromUser: from, toUser: to, amount: Math.abs(g.balance), date: today })
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

  const categories: Record<string, string> = {
    food: '🍕', transport: '🚗', accommodation: '🏠', activities: '🎯',
    drinks: '🍺', shopping: '🛍️', utilities: '💡', health: '💊', other: '📌'
  };
</script>

<svelte:head>
  <title>Split — {data.person.name}</title>
</svelte:head>

<div style="margin-bottom: 12px;">
  <a href="/people" style="font-size: 12px; color: var(--text3); letter-spacing: 0.05em; display: inline-flex; align-items: center; gap: 4px;">← {t('people')}</a>
</div>

<div class="glass-card-static" style="text-align: center; padding: 20px; margin-bottom: 16px;">
  <div class="avatar" style="width: 48px; height: 48px; font-size: 20px; margin: 0 auto 8px; background: {data.person.avatar_color};">{data.person.name[0]}</div>
  <div style="font-family: 'Libre Baskerville', Georgia, serif; font-size: 20px; font-weight: 700; color: var(--gold);">{data.person.name}</div>
  <div class="gold-divider" style="margin: 12px auto;"></div>
  <div class="stat-label" style="margin-bottom: 4px;">{t('total_balance_person')}</div>
  <div class="stat-value" style="font-size: 24px;" class:text-green={data.totalBalance > 0} class:text-red={data.totalBalance < 0}>
    {data.totalBalance > 0 ? '+' : ''}{fmt(data.totalBalance)}
  </div>
  <div style="font-size: 11px; color: var(--text3); margin-top: 4px;">{balanceLabel(data.totalBalance)}</div>
  {#if Math.abs(data.totalBalance) > 0.01}
    <div style="margin-top: 12px;">
      <button class="btn-gold" style="font-size: 11px; padding: 8px 20px;" onclick={settleUp} disabled={settling}>
        {settling ? t('settling') : t('settle_all')}
      </button>
    </div>
  {/if}
</div>

{#if data.sharedExpenses && data.sharedExpenses.length > 0}
  <div class="section-header">{t('shared_expenses')}</div>
  {#each data.sharedExpenses as exp}
    <a href="/expense/{exp.id}" style="text-decoration: none; display: block;">
      <div class="glass-card card-interactive" style="display: flex; align-items: center; gap: 10px; padding: 10px 14px; margin-bottom: 10px;">
        <div class="emoji-icon" style="font-size: 18px; width: 28px; text-align: center; flex-shrink: 0;">{categories[exp.category] || '📌'}</div>
        <div style="flex: 1; min-width: 0;">
          <div style="font-size: 12px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{exp.description}</div>
          <div style="font-size: 11px; color: var(--text3);">
            {exp.group_emoji} {exp.group_name} · {new Date(exp.date).toLocaleDateString(getLocale(), { day: 'numeric', month: 'short' })} · {t('paid_by')} {exp.paid_by_name}
          </div>
        </div>
        <div style="font-family: 'Libre Baskerville', Georgia, serif; font-weight: 600; font-size: 13px;">{fmt(exp.amount)}</div>
      </div>
    </a>
  {/each}
{/if}

{#if data.groupBalances.length > 0}
  <div class="section-header">{t('shared_groups')}</div>
  {#each data.groupBalances as g}
    <a href="/groups/{g.id}" style="text-decoration: none; display: block;">
      <div class="glass-card card-interactive" style="display: flex; align-items: center; gap: 12px; padding: 12px 14px; margin-bottom: 10px;">
        <div class="emoji-icon" style="font-size: 24px;">{g.emoji}</div>
        <div style="flex: 1;">
          <div style="font-size: 12px; font-weight: 500;">{g.name}</div>
          <div style="font-size: 11px; color: var(--text3);">{t('people_count', { count: g.member_count })}</div>
        </div>
        <div style="font-family: 'Libre Baskerville', Georgia, serif; font-weight: 600; font-size: 13px;" class:text-green={g.balance > 0} class:text-red={g.balance < 0}>
          {g.balance > 0 ? '+' : ''}{fmt(g.balance)}
        </div>
      </div>
    </a>
  {/each}
{:else if !data.sharedExpenses || data.sharedExpenses.length === 0}
  <div style="text-align: center; padding: 40px 20px; color: var(--text3); font-size: 12px;">
    {t('no_shared_groups', { name: data.person.name })}
  </div>
{/if}

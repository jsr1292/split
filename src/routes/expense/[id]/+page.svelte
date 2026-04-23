<script lang="ts">
  import { t, getSystemLocale } from '$lib/i18n/index.js';
  let { data } = $props();

  const categories: Record<string, string> = {
    food: '🍕', transport: '🚗', accommodation: '🏠', activities: '🎯',
    drinks: '🍺', shopping: '🛍️', utilities: '💡', health: '💊', other: '📌'
  };

  function fmt(n: number, curr?: string) {
    const currency = curr || 'EUR';
    return new Intl.NumberFormat(getSystemLocale(), { style: 'currency', currency }).format(n);
  }

  async function deleteExpense() {
    if (!(await (window as any).showConfirm(t('delete_this_expense')))) return;
    const res = await fetch(`/api/expenses/${data.expense.id}`, { method: 'DELETE' });
    if (res.ok) {
      window.location.href = `/groups/${data.expense.group_id}`;
    }
  }
</script>

<svelte:head>
  <title>Splitrr — {data.expense?.description || t('expenses')}</title>
</svelte:head>

{#if data.expense}
  {@const exp = data.expense}

  <div style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
    <a href="/groups/{exp.group_id}" style="font-size: 12px; color: var(--text3); letter-spacing: 0.05em; display: inline-flex; align-items: center; gap: 4px;">
      ← {t('groups')}
    </a>
    <a href="/expense/{exp.id}/edit" style="font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--gold);">✏️ {t('edit_expense')}</a>
  </div>

  <!-- Expense Header -->
  <div class="glass-card-static" style="text-align: center; padding: 20px; margin-bottom: 12px;">
    <div class="emoji-icon" style="font-size: 36px; margin-bottom: 8px;">{categories[exp.category] || '📌'}</div>
    <div style="font-family: 'Libre Baskerville', Georgia, serif; font-size: 20px; font-weight: 700; color: var(--gold); margin-bottom: 4px;">{fmt(exp.amount, exp.currency || 'EUR')}</div>
    <div style="font-size: 12px; color: var(--text3);">{t('currency')}: {exp.currency || 'EUR'}</div>
    <div style="font-size: 13px; font-weight: 500; margin-bottom: 4px;">{exp.description}</div>
    <div style="font-size: 11px; color: var(--text3); letter-spacing: 0.1em; text-transform: uppercase;">
      {new Date(exp.date).toLocaleDateString(getSystemLocale(), { day: 'numeric', month: 'long', year: 'numeric' })}
    </div>
    {#if exp.recurring}
      <div style="margin-top: 6px; font-size: 12px; color: var(--gold);">🔄 {exp.recurring === 'weekly' ? t('weekly') : exp.recurring === 'monthly' ? t('monthly') : t('yearly')}</div>
    {/if}
  </div>

  <!-- Who paid -->
  <div style="margin-bottom: 16px;">
    <div class="section-header">{t('paid_by')}</div>
    <div class="glass-card-static" style="display: flex; align-items: center; gap: 10px;">
      <div class="avatar" style="background: {exp.paid_by_color};">{exp.paid_by_name[0]}</div>
      <div style="font-weight: 600; font-size: 13px;">{exp.paid_by_name}</div>
      <div style="margin-left: auto; font-family: 'Libre Baskerville', Georgia, serif; font-weight: 700; font-size: 14px; color: var(--gold);">{fmt(exp.amount, exp.currency || 'EUR')}</div>
    </div>
  </div>

  <!-- Split breakdown -->
  <div style="margin-bottom: 16px;">
    <div class="section-header">{t('split')} ({exp.split_type === 'equal' ? t('split_equally') : exp.split_type})</div>
    {#each data.splits as split}
      <div class="glass-card-static" style="display: flex; align-items: center; gap: 10px; padding: 10px 14px;">
        <div class="avatar" style="background: {split.user_color}; width: 24px; height: 24px; font-size: 12px;">{split.user_name[0]}</div>
        <div style="font-size: 12px; font-weight: 500;">{split.user_name}</div>
        <div style="margin-left: auto; text-align: right;">
          <div style="font-family: 'Libre Baskerville', Georgia, serif; font-size: 13px; font-weight: 600;">
            {fmt(split.share, exp.currency || 'EUR')}
          </div>
          {#if split.base_currency && split.base_currency !== exp.currency}
            <div style="font-size: 11px; color: var(--text3);">≈ {fmt(split.base_amount, split.base_currency)}</div>
          {/if}
        </div>
      </div>
    {/each}
  </div>

  <!-- Items breakdown -->
  {#if data.items && data.items.length > 0}
    <div style="margin-bottom: 16px;">
      <div class="section-header">{t('items')}</div>
      {#each data.items as item}
        <div class="glass-card-static" style="padding: 10px 14px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <div style="font-size: 12px; font-weight: 500;">{item.description}</div>
            <div style="font-family: 'Libre Baskerville', Georgia, serif; font-size: 13px; font-weight: 600; color: var(--gold);">{fmt(item.amount, exp.currency || 'EUR')}</div>
          </div>
          <div style="display: flex; flex-wrap: wrap; gap: 4px;">
            {#each item.splits as split}
              <div style="display: flex; align-items: center; gap: 4px; font-size: 11px; color: var(--text3);">
                <span style="width: 14px; height: 14px; border-radius: 50%; background: {split.user_color}; display: inline-flex; align-items: center; justify-content: center; font-size: 7px; font-weight: 700; color: var(--avatar-text);">{split.user_name[0]}</span>
                {split.user_name}: {fmt(split.share, exp.currency || 'EUR')}
              </div>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Note -->
  {#if exp.note}
    <div style="margin-bottom: 16px;">
      <div class="section-header">{t('note')}</div>
      <div class="glass-card-static" style="font-size: 12px; color: var(--text2);">{exp.note}</div>
    </div>
  {/if}

  <!-- Delete -->
  <div style="text-align: center; margin-top: 20px;">
    <button class="btn-ghost" style="color: var(--red); border-color: rgba(255,77,106,0.3);" onclick={deleteExpense}>
      {t('delete_expense')}
    </button>
  </div>
{:else}
  <div style="text-align: center; padding: 60px 20px;">
    <div style="font-size: 48px; margin-bottom: 16px;">🤷</div>
    <p class="text-muted">{t('expense_not_found')}</p>
    <a href="/" style="margin-top: 12px; display: inline-block;">{t('return')}</a>
  </div>
{/if}

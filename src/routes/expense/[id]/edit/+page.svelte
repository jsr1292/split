<script lang="ts">
  import { t, getSystemLocale } from '$lib/i18n/index.js';
  let { data } = $props();
  const e = data.expense;

  const categoryList = [
    { id: 'food', emoji: '🍕', labelKey: 'category_food' },
    { id: 'transport', emoji: '🚗', labelKey: 'category_transport' },
    { id: 'accommodation', emoji: '🏠', labelKey: 'category_accommodation' },
    { id: 'activities', emoji: '🎯', labelKey: 'category_activities' },
    { id: 'drinks', emoji: '🍺', labelKey: 'category_drinks' },
    { id: 'shopping', emoji: '🛍️', labelKey: 'category_shopping' },
    { id: 'utilities', emoji: '💡', labelKey: 'category_utilities' },
    { id: 'health', emoji: '💊', labelKey: 'category_health' },
    { id: 'other', emoji: '📌', labelKey: 'category_other' },
  ];

  let description = $state(e.description);
  let amount = $state(String(e.amount));
  let amountFocused = $state(false);
  let keepBarOpen = false;
  let barBottom = $state(0);

  if (typeof window !== 'undefined' && visualViewport) {
    visualViewport.addEventListener('resize', () => {
      if (amountFocused) {
        barBottom = window.innerHeight - visualViewport!.height - visualViewport!.offsetTop;
      }
    });
  }
  let paidBy = $state(e.paid_by);
  let category = $state(e.category);
  let date = $state(e.date);
  let note = $state(e.note || '');
  let selectedMembers = $state<string[]>(data.splitUserIds);
  let saving = $state(false);
  let error = $state('');

  let computedAmount = $derived.by(() => {
    if (!amount) return null;
    try {
      const sanitized = amount.replace(/,/g, '.');
      if (!/^[\d+\-*/.\s()]+$/.test(sanitized)) return null;
      const result = Function(`"use strict"; return (${sanitized})`)();
      if (typeof result === 'number' && isFinite(result) && result > 0) return Math.round(result * 100) / 100;
      return null;
    } catch { return null; }
  });

  function toggleMember(id: string) {
    if (selectedMembers.includes(id)) {
      selectedMembers = selectedMembers.filter((m: string) => m !== id);
    } else {
      selectedMembers = [...selectedMembers, id];
    }
  }

  async function submit() {
    if (!description || !amount || !paidBy || selectedMembers.length === 0) {
      error = t('fill_all_fields');
      return;
    }
    saving = true;
    try {
      const res = await fetch(`/api/expenses/${e.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description, amount: computedAmount || parseFloat(amount),
          paidBy, category, date, note, splitUserIds: selectedMembers
        })
      });
      if (res.ok) {
        window.location.href = `/expense/${e.id}`;
      } else {
        const err = await res.json();
        error = err.error || t('error_saving');
      }
    } catch { error = t('connection_error'); }
    finally { saving = false; }
  }

  function opTap(val: string) {
    keepBarOpen = true;
    if (val === 'backspace') amount = amount.slice(0, -1);
    else if (val === 'clear') amount = '';
    else amount += val;
    document.getElementById('amount')?.focus();
    setTimeout(() => { keepBarOpen = false; }, 300);
  }

  const operators = [
    { label: '+', val: ' + ' }, { label: '−', val: ' - ' },
    { label: '×', val: ' * ' }, { label: '÷', val: ' / ' },
    { label: '(', val: '(' }, { label: ')', val: ')' },
    { label: '⌫', val: 'backspace' }, { label: 'C', val: 'clear' },
  ];
</script>

<svelte:head>
  <title>Splitrr — {t('edit_expense')}</title>
</svelte:head>

<div style="margin-bottom: 12px;">
  <a href="/expense/{e.id}" style="font-size: 12px; color: var(--text3); letter-spacing: 0.05em; display: inline-flex; align-items: center; gap: 4px;">← {t('back')}</a>
</div>

<div class="section-header" style="margin-bottom: 16px;">{t('edit_expense')}</div>

{#if error}
  <div style="background: rgba(255,77,106,0.1); border: 1px solid rgba(255,77,106,0.2); border-radius: 6px; padding: 10px 14px; margin-bottom: 12px; font-size: 12px; color: var(--red);">{error}</div>
{/if}

<div class="form-group">
  <label for="desc">{t('description')}</label>
  <input id="desc" type="text" bind:value={description} maxlength="200" />
</div>

<div class="form-group">
  <label for="amount">{t('amount')}</label>
  <input id="amount" type="text" inputmode="decimal" placeholder="0.00" bind:value={amount}
    onfocus={() => amountFocused = true}
    onblur={() => setTimeout(() => { if (!keepBarOpen) amountFocused = false; }, 200)}
    style="font-family: 'Libre Baskerville', Georgia, serif; font-size: 20px; text-align: center; padding: 14px;" />
  {#if amount && computedAmount !== null}
    <div style="text-align: center; margin-top: 6px; font-size: 12px; color: var(--gold); font-family: 'Libre Baskerville', Georgia, serif;">
      = {new Intl.NumberFormat(getSystemLocale(), { style: 'currency', currency: 'EUR' }).format(computedAmount)}
    </div>
  {/if}
</div>

<div class="form-group">
  <label>{t('category')}</label>
  <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;">
    {#each categoryList as cat}
      <button onclick={() => category = cat.id}
        style="display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 10px 6px; border-radius: 6px; min-height: 44px; border: 1px solid {category === cat.id ? 'var(--gold)' : 'var(--border)'}; background: {category === cat.id ? 'rgba(201,168,76,0.1)' : 'var(--bg2)'}; cursor: pointer; color: {category === cat.id ? 'var(--gold)' : 'var(--text3)'}; font-family: inherit; font-size: 11px;">
        <span style="font-size: 18px;">{cat.emoji}</span><span>{t(cat.labelKey)}</span>
      </button>
    {/each}
  </div>
</div>

<div class="form-group">
  <label for="paidby">{t('paid_by_label')}</label>
  <select id="paidby" bind:value={paidBy}>
    {#each data.members as m}
      <option value={m.id}>{m.name} {m.is_self ? t('you') : ''}</option>
    {/each}
  </select>
</div>

<div class="form-group">
  <label>{t('split_between')}</label>
  <div style="display: flex; flex-wrap: wrap; gap: 6px;">
    {#each data.members as m}
      <button onclick={() => toggleMember(m.id)}
        style="display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 20px; border: 1px solid {selectedMembers.includes(m.id) ? 'var(--gold)' : 'var(--border)'}; background: {selectedMembers.includes(m.id) ? 'rgba(201,168,76,0.1)' : 'transparent'}; cursor: pointer; color: {selectedMembers.includes(m.id) ? 'var(--gold)' : 'var(--text3)'}; font-family: inherit; font-size: 11px;">
        <span style="width: 20px; height: 20px; border-radius: 50%; background: {m.avatar_color}; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: #0a0d14;">{m.name[0]}</span>
        {m.name}
      </button>
    {/each}
  </div>
</div>

<div class="form-group">
  <label for="date">{t('date')}</label>
  <input id="date" type="date" bind:value={date} />
</div>

<div class="form-group">
  <label for="note">{t('note')}</label>
  <input id="note" type="text" bind:value={note} maxlength="500" />
</div>

<div style="margin-top: 20px; margin-bottom: 80px;">
  <button class="btn-gold" style="width: 100%; padding: 12px;" onclick={submit} disabled={saving}>
    {saving ? t('saving') : t('save_changes_expense')}
  </button>
</div>

{#if amountFocused}
  <div style="position: fixed; bottom: {barBottom}px; left: 0; right: 0; z-index: 60; background: var(--bg); border-top: 1px solid var(--border); display: flex; padding: 6px 4px; padding-bottom: calc(6px + env(safe-area-inset-bottom));">
    {#each operators as op}
      <button onclick={() => opTap(op.val)} onmousedown={(e) => e.preventDefault()}
        style="flex: 1; padding: 14px 0; background: var(--bg2); border: none; color: var(--gold); font-family: 'JetBrains Mono', monospace; font-size: 18px; font-weight: 600; cursor: pointer; margin: 0 2px; border-radius: 6px;">{op.label}</button>
    {/each}
  </div>
{/if}

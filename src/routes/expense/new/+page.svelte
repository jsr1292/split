<script lang="ts">
  import { t, getSystemLocale } from '$lib/i18n/index.js';
  let { data } = $props();

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

  let groupId = $state(data.preselectedGroup || '');
  let currency = $state('EUR');
  let description = $state('');
  let amount = $state('');
  let amountFocused = $state(false);
  let keepBarOpen = false;

  let computedAmount = $derived.by(() => {
    if (!amount) return null;
    try {
      const sanitized = amount.replace(/,/g, '.');
      if (!/^[\d+\-*/.\s()]+$/.test(sanitized)) return null;
      const result = Function(`"use strict"; return (${sanitized})`)();
      if (typeof result === 'number' && isFinite(result) && result > 0) {
        return Math.round(result * 100) / 100;
      }
      return null;
    } catch {
      return null;
    }
  });

  let paidBy = $state(data.self?.id || '');
  let conversionPreview = $state<{ amount: number; rate: number } | null>(null);
  let category = $state('other');
  let date = $state(new Date().toISOString().split('T')[0]);
  let note = $state('');
  let selectedMembers = $state<string[]>(data.members.map((m: any) => m.id));
  let saving = $state(false);
  let error = $state('');

  let currentMembers = $state(data.members);
  async function onGroupChange() {
    if (!groupId) { currentMembers = []; currency = 'EUR'; return; }
    const res = await fetch(`/api/groups/${groupId}/members`);
    if (res.ok) {
      currentMembers = await res.json();
      selectedMembers = currentMembers.map((m: any) => m.id);
      if (!currentMembers.find((m: any) => m.id === paidBy) && data.self) {
        paidBy = data.self.id;
      }
      const groupRes = await fetch(`/api/groups/${groupId}`);
      if (groupRes.ok) {
        const groupData = await groupRes.json();
        currency = groupData.currency || 'EUR';
      }
    }
  }

  async function updateConversionPreview() {
    if (!amount || computedAmount === null || currency === data.userBaseCurrency) {
      conversionPreview = null;
      return;
    }
    try {
      const res = await fetch(`/api/rates?from=${currency}&to=${data.userBaseCurrency}`);
      if (res.ok) {
        const d = await res.json();
        conversionPreview = {
          amount: Math.round(computedAmount * d.rate * 100) / 100,
          rate: d.rate
        };
      }
    } catch {
      conversionPreview = null;
    }
  }

  $effect(() => {
    currency;
    amount;
    updateConversionPreview();
  });

  function toggleMember(id: string) {
    if (selectedMembers.includes(id)) {
      selectedMembers = selectedMembers.filter((m: string) => m !== id);
    } else {
      selectedMembers = [...selectedMembers, id];
    }
  }

  let recurring = $state('no');
  const recurringOptions = [
    { value: 'no', labelKey: 'no_repeat' },
    { value: 'weekly', labelKey: 'weekly' },
    { value: 'monthly', labelKey: 'monthly' },
    { value: 'yearly', labelKey: 'yearly' },
  ];

  let splitMode = $state<'total' | 'items'>('total');
  let items = $state<{ description: string; amount: string; splitUserIds: string[] }[]>([]);

  function addItem() {
    items = [...items, { description: '', amount: '', splitUserIds: [...selectedMembers] }];
  }

  function removeItem(i: number) {
    items = items.filter((_, idx) => idx !== i);
  }

  function toggleItemMember(i: number, uid: string) {
    items = items.map((item, idx) => {
      if (idx !== i) return item;
      const newSplit = item.splitUserIds.includes(uid)
        ? item.splitUserIds.filter((id: string) => id !== uid)
        : [...item.splitUserIds, uid];
      return { ...item, splitUserIds: newSplit };
    });
  }

  let computedItemsTotal = $derived.by(() => {
    let total = 0;
    for (const item of items) {
      const amt = parseFloat(item.amount.replace(',', '.'));
      if (!isNaN(amt) && amt > 0) total += amt;
    }
    return Math.round(total * 100) / 100;
  });

  async function submit() {
    if (!description || !amount || !groupId || !paidBy || selectedMembers.length === 0) {
      error = t('fill_all_fields');
      return;
    }
    if (splitMode === 'items' && items.length > 0) {
      const validItems = items.filter(i => i.description && i.amount && i.splitUserIds.length > 0);
      if (validItems.length === 0) { error = t('add_valid_item'); return; }
    }
    saving = true;
    error = '';
    try {
      // Generate idempotency key for deduplication
      const idempotencyKey = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      let payload: any = {
        groupId, description, amount: computedAmount || parseFloat(amount),
        paidBy, category, date, note, currency,
        splitUserIds: selectedMembers, createdBy: data.self?.id,
        recurring: recurring === 'no' ? null : recurring,
        idempotency_key: idempotencyKey
      };
      if (splitMode === 'items' && items.length > 0) {
        payload.items = items.map(i => ({
          description: i.description,
          amount: parseFloat(i.amount.replace(',', '.')),
          splitUserIds: i.splitUserIds
        }));
      }
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        window.location.href = `/groups/${groupId}`;
      } else if (res.status === 202) {
        if (typeof window !== 'undefined' && (window as any).showOfflineToast) {
          (window as any).showOfflineToast();
        }
        setTimeout(() => { window.location.href = `/groups/${groupId}`; }, 1500);
      } else {
        const err = await res.json();
        error = err.error || t('error_saving');
      }
    } catch {
      error = t('connection_error');
    } finally {
      saving = false;
    }
  }

  function tapDigit(d: string) {
    amount += d;
  }

  function opTap(val: string) {
    keepBarOpen = true;
    if (val === 'backspace') {
      amount = amount.slice(0, -1);
    } else if (val === 'clear') {
      amount = '';
    } else {
      // Prevent double operators (e.g., "5 +  + 3")
      const lastChar = amount.trim().slice(-1);
      const isOperator = ['+', '-', '*', '/'].some(op => val.includes(op));
      if (isOperator && lastChar && ['+', '-', '*', '/', '('].includes(lastChar)) {
        // Replace last operator instead of appending
        amount = amount.trimEnd().slice(0, -1).trimEnd() + val;
      } else {
        amount += val;
      }
    }
    document.getElementById('amount')?.focus();
    setTimeout(() => { keepBarOpen = false; }, 300);
  }
</script>

<svelte:head>
  <title>Splitrr — {t('new_expense')}</title>
</svelte:head>

<!-- Back link -->
<div style="margin-bottom: 12px;">
  <a href="javascript:history.back()" style="font-size: 12px; color: var(--text3); letter-spacing: 0.05em; display: inline-flex; align-items: center; gap: 4px;">
    ← {t('back')}
  </a>
</div>

<div class="section-header" style="margin-bottom: 16px;">{t('new_expense')}</div>

{#if error}
  <div style="background: rgba(255,77,106,0.1); border: 1px solid rgba(255,77,106,0.2); border-radius: 6px; padding: 10px 14px; margin-bottom: 12px; font-size: 12px; color: var(--red);">
    {error}
  </div>
{/if}

<div class="form-group">
  <label for="group">{t('groups')}</label>
  <select id="group" bind:value={groupId} onchange={onGroupChange}>
    <option value="">{t('select_group')}</option>
    {#each data.groups as g}
      <option value={g.id}>{g.emoji} {g.name}</option>
    {/each}
  </select>
</div>

<div class="form-group">
  <label for="desc">{t('description')}</label>
  <input id="desc" type="text" placeholder={t('description_placeholder')} bind:value={description} maxlength="200" />
</div>

<div class="form-group">
  <label for="amount">{t('amount')}</label>
  <div style="display: flex; gap: 8px; align-items: stretch;">
    <input
      id="amount"
      type="text"
      inputmode="none"
      placeholder="0.00"
      bind:value={amount}
      onfocus={() => { amountFocused = true; }}
      onblur={() => {
        setTimeout(() => {
          if (!keepBarOpen) amountFocused = false;
        }, 200);
      }}
      style="flex: 1; font-family: 'Libre Baskerville', Georgia, serif; font-size: 20px; text-align: center; padding: 14px;"
    />
    <select
      bind:value={currency}
      style="width: 80px; font-size: 14px; text-align: center; padding: 8px 4px;"
    >
      {#each data.currencies as curr}
        <option value={curr}>{curr}</option>
      {/each}
    </select>
  </div>
  {#if amount && computedAmount !== null}
    <div style="text-align: center; margin-top: 6px; font-size: 12px; color: var(--gold); font-family: 'Libre Baskerville', Georgia, serif;">
      {#if currency === data.userBaseCurrency}
        = {new Intl.NumberFormat(getSystemLocale(), { style: 'currency', currency: currency }).format(computedAmount)}
      {:else if conversionPreview}
        ≈ {new Intl.NumberFormat(getSystemLocale(), { style: 'currency', currency: data.userBaseCurrency }).format(conversionPreview.amount)}
        <span style="font-size: 11px; color: var(--text3);"> ({currency} → {data.userBaseCurrency})</span>
      {:else}
        = {new Intl.NumberFormat(getSystemLocale(), { style: 'currency', currency: currency }).format(computedAmount)}
      {/if}
    </div>
  {:else if amount && computedAmount === null && /[\+\-\*\/]/.test(amount)}
    <div style="text-align: center; margin-top: 6px; font-size: 11px; color: var(--red);">Invalid expression</div>
  {/if}
</div>

<!-- Category Picker -->
<div class="form-group">
  <label>{t('category')}</label>
  <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;">
    {#each categoryList as cat}
      <button
        onclick={() => category = cat.id}
        onmouseover={(e) => { if (category !== cat.id) { (e.currentTarget as HTMLElement).style.borderColor = 'var(--gold-dim)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; } }}
        onmouseout={(e) => { if (category !== cat.id) { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; } }}
        style="display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 10px 6px; border-radius: 6px; min-height: 44px; border: 1px solid {category === cat.id ? 'var(--gold)' : 'var(--border)'}; background: {category === cat.id ? 'rgba(201,168,76,0.1)' : 'var(--bg2)'}; cursor: pointer; color: {category === cat.id ? 'var(--gold)' : 'var(--text3)'}; font-family: inherit; font-size: 11px; letter-spacing: 0.05em; transition: all 0.2s ease;"
      >
        <span class="emoji-icon" style="font-size: 18px;">{cat.emoji}</span>
        <span>{t(cat.labelKey)}</span>
      </button>
    {/each}
  </div>
</div>

<div class="form-group">
  <label for="paidby">{t('paid_by_label')}</label>
  <select id="paidby" bind:value={paidBy}>
    {#each currentMembers as m}
      <option value={m.id}>{m.name} {m.is_self ? t('you') : ''}</option>
    {/each}
  </select>
</div>

<!-- Split between -->
<div class="form-group">
  <label>{t('split_between')}</label>
  {#if currentMembers.length === 0}
    <div style="font-size: 11px; color: var(--text3); padding: 8px 0;">{t('select_group_first')}</div>
  {:else}
  <div style="display: flex; flex-wrap: wrap; gap: 6px;">
    {#each currentMembers as m}
      <button
        onclick={() => toggleMember(m.id)}
        style="display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 20px; border: 1px solid {selectedMembers.includes(m.id) ? 'var(--gold)' : 'var(--border)'}; background: {selectedMembers.includes(m.id) ? 'rgba(201,168,76,0.1)' : 'transparent'}; cursor: pointer; color: {selectedMembers.includes(m.id) ? 'var(--gold)' : 'var(--text3)'}; font-family: inherit; font-size: 11px; transition: all 0.15s;"
      >
        <span style="width: 20px; height: 20px; border-radius: 50%; background: {m.avatar_color}; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: #0a0d14;">{m.name[0]}</span>
        {m.name}
      </button>
    {/each}
  </div>
  {/if}
</div>

<div class="form-group">
  <label for="date">{t('date')}</label>
  <input id="date" type="date" bind:value={date} />
</div>

<div class="form-group">
  <label for="recurring">{t('repeat')}</label>
  <select id="recurring" bind:value={recurring}>
    {#each recurringOptions as opt}
      <option value={opt.value}>{t(opt.labelKey)}</option>
    {/each}
  </select>
</div>

<div class="form-group">
  <label>{t('split_mode')}</label>
  <div style="display: flex; gap: 6px;">
    <button
      onclick={() => splitMode = 'total'}
      style="flex:1; padding: 8px; border-radius: 6px; border: 1px solid {splitMode === 'total' ? 'var(--gold)' : 'var(--border)'}; background: {splitMode === 'total' ? 'rgba(201,168,76,0.1)' : 'transparent'}; color: {splitMode === 'total' ? 'var(--gold)' : 'var(--text3)'}; font-family: inherit; font-size: 11px; cursor: pointer; transition: all 0.15s;"
    >{t('total_amount')}</button>
    <button
      onclick={() => splitMode = 'items'}
      style="flex:1; padding: 8px; border-radius: 6px; border: 1px solid {splitMode === 'items' ? 'var(--gold)' : 'var(--border)'}; background: {splitMode === 'items' ? 'rgba(201,168,76,0.1)' : 'transparent'}; color: {splitMode === 'items' ? 'var(--gold)' : 'var(--text3)'}; font-family: inherit; font-size: 11px; cursor: pointer; transition: all 0.15s;"
    >{t('per_item')}</button>
  </div>
</div>

{#if splitMode === 'items'}
  <div class="form-group">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
      <label style="margin-bottom: 0;">{t('items')}</label>
      <button onclick={addItem} style="background: none; border: 1px solid var(--gold-dim); border-radius: 4px; color: var(--gold); font-size: 12px; padding: 3px 8px; cursor: pointer; font-family: inherit;">+ {t('add')}</button>
    </div>
    {#each items as item, i}
      <div style="background: var(--bg2); border: 1px solid var(--border); border-radius: 6px; padding: 10px; margin-bottom: 8px;">
        <div style="display: flex; gap: 6px; margin-bottom: 6px;">
          <input type="text" placeholder={t('item_description')} bind:value={item.description} style="flex: 1; font-size: 13px; padding: 7px 9px;" />
          <input type="text" inputmode="decimal" placeholder="€" bind:value={item.amount} style="width: 70px; font-size: 13px; padding: 7px 9px; text-align: right; font-family: 'Libre Baskerville', Georgia, serif;" />
          <button onclick={() => removeItem(i)} style="background: none; border: none; color: var(--red); cursor: pointer; font-size: 14px; padding: 4px;">✕</button>
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 4px;">
          {#each currentMembers as m}
            <button
              onclick={() => toggleItemMember(i, m.id)}
              style="display: flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 12px; border: 1px solid {item.splitUserIds.includes(m.id) ? 'var(--gold)' : 'var(--border)'}; background: {item.splitUserIds.includes(m.id) ? 'rgba(201,168,76,0.1)' : 'transparent'}; cursor: pointer; color: {item.splitUserIds.includes(m.id) ? 'var(--gold)' : 'var(--text3)'}; font-family: inherit; font-size: 11px; transition: all 0.15s;"
            >
              <span style="width: 14px; height: 14px; border-radius: 50%; background: {m.avatar_color}; display: flex; align-items: center; justify-content: center; font-size: 7px; font-weight: 700; color: #0a0d14;">{m.name[0]}</span>
              {m.name}
            </button>
          {/each}
        </div>
      </div>
    {/each}
    {#if items.length > 0}
      <div style="text-align: right; font-size: 11px; color: var(--gold); font-family: 'Libre Baskerville', Georgia, serif;">
        {t('total')}: {new Intl.NumberFormat(getSystemLocale(), { style: 'currency', currency: 'EUR' }).format(computedItemsTotal)}
      </div>
    {/if}
  </div>
{/if}

<div class="form-group">
  <label for="note">{t('note_optional')}</label>
  <input id="note" type="text" placeholder={t('note_placeholder')} bind:value={note} maxlength="500" />
</div>

<div style="margin-top: 20px; margin-bottom: 340px;">
  <button class="btn-gold" style="width: 100%; padding: 12px;" onclick={submit} disabled={saving}>
    {saving ? t('saving_expense') : t('save_expense')}
  </button>
</div>

<!-- Custom numpad + operator bar -->
{#if amountFocused}
  <div class="custom-numpad" onmousedown={(e) => e.preventDefault()} ontouchstart={(e) => e.preventDefault()}>
    <!-- Operators row -->
    <div class="numpad-row operators-row">
      <button class="numpad-key op-key" onclick={() => opTap(' + ')}>+</button>
      <button class="numpad-key op-key" onclick={() => opTap(' - ')}>−</button>
      <button class="numpad-key op-key" onclick={() => opTap(' * ')}>×</button>
      <button class="numpad-key op-key" onclick={() => opTap(' / ')}>÷</button>
      <button class="numpad-key op-key" onclick={() => opTap('(')}>(</button>
      <button class="numpad-key op-key" onclick={() => opTap(')')}>)</button>
      <button class="numpad-key op-key del-key" onclick={() => opTap('backspace')}>⌫</button>
    </div>
    <!-- Digits -->
    <div class="numpad-row">
      <button class="numpad-key" onclick={() => tapDigit('1')}>1</button>
      <button class="numpad-key" onclick={() => tapDigit('2')}>2</button>
      <button class="numpad-key" onclick={() => tapDigit('3')}>3</button>
    </div>
    <div class="numpad-row">
      <button class="numpad-key" onclick={() => tapDigit('4')}>4</button>
      <button class="numpad-key" onclick={() => tapDigit('5')}>5</button>
      <button class="numpad-key" onclick={() => tapDigit('6')}>6</button>
    </div>
    <div class="numpad-row">
      <button class="numpad-key" onclick={() => tapDigit('7')}>7</button>
      <button class="numpad-key" onclick={() => tapDigit('8')}>8</button>
      <button class="numpad-key" onclick={() => tapDigit('9')}>9</button>
    </div>
    <div class="numpad-row">
      <button class="numpad-key" onclick={() => tapDigit('.')}>.</button>
      <button class="numpad-key" onclick={() => tapDigit('0')}>0</button>
      <button class="numpad-key done-key" onclick={() => { amountFocused = false; document.getElementById('amount')?.blur(); }}>OK</button>
    </div>
  </div>
{/if}

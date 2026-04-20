<script lang="ts">
  let { data } = $props();

  const categoryList = [
    { id: 'food', emoji: '🍕', label: 'Comida' },
    { id: 'transport', emoji: '🚗', label: 'Transporte' },
    { id: 'accommodation', emoji: '🏠', label: 'Alojamiento' },
    { id: 'activities', emoji: '🎯', label: 'Actividades' },
    { id: 'drinks', emoji: '🍺', label: 'Copas' },
    { id: 'shopping', emoji: '🛍️', label: 'Compras' },
    { id: 'utilities', emoji: '💡', label: 'Servicios' },
    { id: 'health', emoji: '💊', label: 'Salud' },
    { id: 'other', emoji: '📌', label: 'Otro' },
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
      // Fetch group details to get default currency
      const groupRes = await fetch(`/api/groups/${groupId}`);
      if (groupRes.ok) {
        const groupData = await groupRes.json();
        currency = groupData.currency || 'EUR';
      }
    }
  }

  // Fetch conversion preview when amount or currency changes
  async function updateConversionPreview() {
    if (!amount || computedAmount === null || currency === data.userBaseCurrency) {
      conversionPreview = null;
      return;
    }
    try {
      const res = await fetch(`/api/rates?from=${currency}&to=${data.userBaseCurrency}`);
      if (res.ok) {
        const data = await res.json();
        conversionPreview = {
          amount: Math.round(computedAmount * data.rate * 100) / 100,
          rate: data.rate
        };
      }
    } catch {
      conversionPreview = null;
    }
  }

  // React to currency changes
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

  // Recurring state
  let recurring = $state('no');
  const recurringOptions = [
    { value: 'no', label: 'No repetir' },
    { value: 'weekly', label: 'Semanal' },
    { value: 'monthly', label: 'Mensual' },
    { value: 'yearly', label: 'Anual' },
  ];

  // Items state
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
      error = 'Completa todos los campos';
      return;
    }
    if (splitMode === 'items' && items.length > 0) {
      const validItems = items.filter(i => i.description && i.amount && i.splitUserIds.length > 0);
      if (validItems.length === 0) { error = 'Añade al menos un artículo válido'; return; }
    }
    saving = true;
    error = '';
    try {
      let payload: any = {
        groupId, description, amount: computedAmount || parseFloat(amount),
        paidBy, category, date, note, currency,
        splitUserIds: selectedMembers, createdBy: data.self?.id,
        recurring: recurring === 'no' ? null : recurring
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
        // Queued offline
        if (typeof window !== 'undefined' && (window as any).showOfflineToast) {
          (window as any).showOfflineToast();
        }
        setTimeout(() => { window.location.href = `/groups/${groupId}`; }, 1500);
      } else {
        const err = await res.json();
        error = err.error || 'Error al guardar';
      }
    } catch {
      error = 'Error de conexión';
    } finally {
      saving = false;
    }
  }

  function opTap(val: string) {
    keepBarOpen = true;
    if (val === 'backspace') {
      amount = amount.slice(0, -1);
    } else if (val === 'clear') {
      amount = '';
    } else {
      amount += val;
    }
    document.getElementById('amount')?.focus();
    // Keep bar open through the blur→focus cycle
    setTimeout(() => { keepBarOpen = false; }, 300);
  }

  const operators = [
    { label: '+', val: ' + ' },
    { label: '−', val: ' - ' },
    { label: '×', val: ' * ' },
    { label: '÷', val: ' / ' },
    { label: '(', val: '(' },
    { label: ')', val: ')' },
    { label: '⌫', val: 'backspace' },
    { label: 'C', val: 'clear' },
  ];
</script>

<svelte:head>
  <title>Split — Nuevo gasto</title>
</svelte:head>

<!-- Back link -->
<div style="margin-bottom: 12px;">
  <a href="javascript:history.back()" style="font-size: 10px; color: var(--text3); letter-spacing: 0.05em; display: inline-flex; align-items: center; gap: 4px;">
    ← Volver
  </a>
</div>

<div class="section-header" style="margin-bottom: 16px;">Nuevo gasto</div>

{#if error}
  <div style="background: rgba(255,77,106,0.1); border: 1px solid rgba(255,77,106,0.2); border-radius: 6px; padding: 10px 14px; margin-bottom: 12px; font-size: 12px; color: var(--red);">
    {error}
  </div>
{/if}

<div class="form-group">
  <label for="group">Grupo</label>
  <select id="group" bind:value={groupId} onchange={onGroupChange}>
    <option value="">Selecciona un grupo</option>
    {#each data.groups as g}
      <option value={g.id}>{g.emoji} {g.name}</option>
    {/each}
  </select>
</div>

<div class="form-group">
  <label for="desc">Descripción</label>
  <input id="desc" type="text" placeholder="Ej: Cena en el restaurante" bind:value={description} />
</div>

<div class="form-group">
  <label for="amount">Importe</label>
  <div style="display: flex; gap: 8px; align-items: stretch;">
    <input
      id="amount"
      type="text"
      inputmode="decimal"
      placeholder="0.00"
      bind:value={amount}
      onfocus={() => amountFocused = true}
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
        = {new Intl.NumberFormat('es-ES', { style: 'currency', currency: currency }).format(computedAmount)}
      {:else if conversionPreview}
        ≈ {new Intl.NumberFormat('es-ES', { style: 'currency', currency: data.userBaseCurrency }).format(conversionPreview.amount)}
        <span style="font-size: 9px; color: var(--text3);"> ({currency} → {data.userBaseCurrency})</span>
      {:else}
        = {new Intl.NumberFormat('es-ES', { style: 'currency', currency: currency }).format(computedAmount)}
      {/if}
    </div>
  {/if}
</div>

<!-- Category Picker -->
<div class="form-group">
  <label>Categoría</label>
  <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;">
    {#each categoryList as cat}
      <button
        onclick={() => category = cat.id}
        style="display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 4px; border-radius: 6px; border: 1px solid {category === cat.id ? 'var(--gold)' : 'var(--border)'}; background: {category === cat.id ? 'rgba(201,168,76,0.1)' : 'var(--bg2)'}; cursor: pointer; color: {category === cat.id ? 'var(--gold)' : 'var(--text3)'}; font-family: inherit; font-size: 9px; letter-spacing: 0.05em; transition: all 0.15s;"
      >
        <span style="font-size: 18px;">{cat.emoji}</span>
        <span>{cat.label}</span>
      </button>
    {/each}
  </div>
</div>

<div class="form-group">
  <label for="paidby">Pagado por</label>
  <select id="paidby" bind:value={paidBy}>
    {#each currentMembers as m}
      <option value={m.id}>{m.name} {m.is_self ? '(tú)' : ''}</option>
    {/each}
  </select>
</div>

<!-- Split between -->
<div class="form-group">
  <label>Dividir entre</label>
  {#if currentMembers.length === 0}
    <div style="font-size: 11px; color: var(--text3); padding: 8px 0;">Selecciona un grupo primero</div>
  {:else}
  <div style="display: flex; flex-wrap: wrap; gap: 6px;">
    {#each currentMembers as m}
      <button
        onclick={() => toggleMember(m.id)}
        style="display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 20px; border: 1px solid {selectedMembers.includes(m.id) ? 'var(--gold)' : 'var(--border)'}; background: {selectedMembers.includes(m.id) ? 'rgba(201,168,76,0.1)' : 'transparent'}; cursor: pointer; color: {selectedMembers.includes(m.id) ? 'var(--gold)' : 'var(--text3)'}; font-family: inherit; font-size: 11px; transition: all 0.15s;"
      >
        <span style="width: 20px; height: 20px; border-radius: 50%; background: {m.avatar_color}; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 700; color: #0a0d14;">{m.name[0]}</span>
        {m.name}
      </button>
    {/each}
  </div>
  {/if}
</div>

<div class="form-group">
  <label for="date">Fecha</label>
  <input id="date" type="date" bind:value={date} />
</div>

<div class="form-group">
  <label for="recurring">Repetir</label>
  <select id="recurring" bind:value={recurring}>
    {#each recurringOptions as opt}
      <option value={opt.value}>{opt.label}</option>
    {/each}
  </select>
</div>

<div class="form-group">
  <label>Modo de reparto</label>
  <div style="display: flex; gap: 6px;">
    <button
      onclick={() => splitMode = 'total'}
      style="flex:1; padding: 8px; border-radius: 6px; border: 1px solid {splitMode === 'total' ? 'var(--gold)' : 'var(--border)'}; background: {splitMode === 'total' ? 'rgba(201,168,76,0.1)' : 'transparent'}; color: {splitMode === 'total' ? 'var(--gold)' : 'var(--text3)'}; font-family: inherit; font-size: 11px; cursor: pointer; transition: all 0.15s;"
    >Importe total</button>
    <button
      onclick={() => splitMode = 'items'}
      style="flex:1; padding: 8px; border-radius: 6px; border: 1px solid {splitMode === 'items' ? 'var(--gold)' : 'var(--border)'}; background: {splitMode === 'items' ? 'rgba(201,168,76,0.1)' : 'transparent'}; color: {splitMode === 'items' ? 'var(--gold)' : 'var(--text3)'}; font-family: inherit; font-size: 11px; cursor: pointer; transition: all 0.15s;"
    >Por artículos</button>
  </div>
</div>

{#if splitMode === 'items'}
  <div class="form-group">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
      <label style="margin-bottom: 0;">Artículos</label>
      <button onclick={addItem} style="background: none; border: 1px solid var(--gold-dim); border-radius: 4px; color: var(--gold); font-size: 10px; padding: 3px 8px; cursor: pointer; font-family: inherit;">+ Añadir</button>
    </div>
    {#each items as item, i}
      <div style="background: var(--bg2); border: 1px solid var(--border); border-radius: 6px; padding: 10px; margin-bottom: 8px;">
        <div style="display: flex; gap: 6px; margin-bottom: 6px;">
          <input type="text" placeholder="Descripción" bind:value={item.description} style="flex: 1; font-size: 13px; padding: 7px 9px;" />
          <input type="text" inputmode="decimal" placeholder="€" bind:value={item.amount} style="width: 70px; font-size: 13px; padding: 7px 9px; text-align: right; font-family: 'Libre Baskerville', Georgia, serif;" />
          <button onclick={() => removeItem(i)} style="background: none; border: none; color: var(--red); cursor: pointer; font-size: 14px; padding: 4px;">✕</button>
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 4px;">
          {#each currentMembers as m}
            <button
              onclick={() => toggleItemMember(i, m.id)}
              style="display: flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 12px; border: 1px solid {item.splitUserIds.includes(m.id) ? 'var(--gold)' : 'var(--border)'}; background: {item.splitUserIds.includes(m.id) ? 'rgba(201,168,76,0.1)' : 'transparent'}; cursor: pointer; color: {item.splitUserIds.includes(m.id) ? 'var(--gold)' : 'var(--text3)'}; font-family: inherit; font-size: 9px; transition: all 0.15s;"
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
        Total: {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(computedItemsTotal)}
      </div>
    {/if}
  </div>
{/if}

<div class="form-group">
  <label for="note">Nota (opcional)</label>
  <input id="note" type="text" placeholder="Detalles extra..." bind:value={note} />
</div>

<div style="margin-top: 20px; margin-bottom: 80px;">
  <button class="btn-gold" style="width: 100%; padding: 12px;" onclick={submit} disabled={saving}>
    {saving ? 'Guardando...' : 'Añadir gasto'}
  </button>
</div>

<!-- Fixed operator bar — only shows when amount field is focused -->
{#if amountFocused}
  <div style="position: fixed; bottom: 0; left: 0; right: 0; z-index: 60; background: var(--bg); border-top: 1px solid var(--border); display: flex; padding: 6px 4px; padding-bottom: calc(6px + env(safe-area-inset-bottom));">
    {#each operators as op}
      <button
        onclick={() => opTap(op.val)}
        onmousedown={(e) => e.preventDefault()}
        style="flex: 1; padding: 14px 0; background: var(--bg2); border: none; color: var(--gold); font-family: 'JetBrains Mono', monospace; font-size: 18px; font-weight: 600; cursor: pointer; margin: 0 2px; border-radius: 6px;"
      >{op.label}</button>
    {/each}
  </div>
{/if}

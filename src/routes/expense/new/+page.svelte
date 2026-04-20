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
  let description = $state('');
  let amount = $state('');
  let paidBy = $state(data.self?.id || '');
  let category = $state('other');
  let splitType = $state('equal');
  let date = $state(new Date().toISOString().split('T')[0]);
  let note = $state('');
  let selectedMembers = $state<string[]>(data.members.map((m: any) => m.id));
  let saving = $state(false);
  let error = $state('');

  // Update members when group changes
  let currentMembers = $state(data.members);
  async function onGroupChange() {
    if (!groupId) { currentMembers = []; return; }
    const res = await fetch(`/api/groups/${groupId}/members`);
    if (res.ok) {
      currentMembers = await res.json();
      selectedMembers = currentMembers.map((m: any) => m.id);
      if (!currentMembers.find((m: any) => m.id === paidBy) && data.self) {
        paidBy = data.self.id;
      }
    }
  }

  function toggleMember(id: string) {
    if (selectedMembers.includes(id)) {
      selectedMembers = selectedMembers.filter((m: string) => m !== id);
    } else {
      selectedMembers = [...selectedMembers, id];
    }
  }

  async function submit() {
    if (!description || !amount || !groupId || !paidBy || selectedMembers.length === 0) {
      error = 'Completa todos los campos';
      return;
    }
    saving = true;
    error = '';

    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId, description, amount: parseFloat(amount),
          paidBy, splitType, category, date, note,
          splitUserIds: selectedMembers, createdBy: data.self?.id
        })
      });
      if (res.ok) {
        window.location.href = `/groups/${groupId}`;
      } else {
        const err = await res.json();
        error = err.error || 'Error al guardar';
      }
    } catch (e) {
      error = 'Error de conexión';
    } finally {
      saving = false;
    }
  }
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
  <label for="amount">Importe (€)</label>
  <input id="amount" type="text" inputmode="decimal" placeholder="0.00" bind:value={amount} style="font-family: 'Libre Baskerville', Georgia, serif; font-size: 20px; text-align: center; padding: 14px;" />
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
</div>

<div class="form-group">
  <label for="date">Fecha</label>
  <input id="date" type="date" bind:value={date} />
</div>

<div class="form-group">
  <label for="note">Nota (opcional)</label>
  <input id="note" type="text" placeholder="Detalles extra..." bind:value={note} />
</div>

<div style="margin-top: 20px;">
  <button class="btn-gold" style="width: 100%; padding: 12px;" onclick={submit} disabled={saving}>
    {saving ? 'Guardando...' : 'Añadir gasto'}
  </button>
</div>

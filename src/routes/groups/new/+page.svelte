<script lang="ts">
  let { data } = $props();

  const emojiList = ['🏠', '✈️', '🏖️', '🍕', '🎯', '🎄', '💍', '🚗', '⚽', '🎮', '🍻', '🎵', '🏔️', '🚢', '🎪'];

  let name = $state('');
  let emoji = $state('🏠');
  let defaultCurrency = $state('EUR');
  let selectedMembers = $state<string[]>([data.self?.id || '']);
  let newMemberName = $state('');
  let saving = $state(false);
  let error = $state('');

  function toggleMember(id: string) {
    if (selectedMembers.includes(id)) {
      if (id === data.self?.id) return; // Can't remove self
      selectedMembers = selectedMembers.filter((m: string) => m !== id);
    } else {
      selectedMembers = [...selectedMembers, id];
    }
  }

  async function addMember() {
    if (!newMemberName.trim()) return;
    const res = await fetch('/api/people', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newMemberName.trim() })
    });
    if (res.ok) {
      const user = await res.json();
      data.people = [...data.people, user];
      selectedMembers = [...selectedMembers, user.id];
      newMemberName = '';
    }
  }

  async function submit() {
    if (!name.trim() || selectedMembers.length < 2) {
      error = 'Añade nombre y al menos 2 personas';
      return;
    }
    saving = true;
    error = '';

    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), emoji, memberIds: selectedMembers, defaultCurrency })
      });
      if (res.ok) {
        const group = await res.json();
        window.location.href = `/groups/${group.id}`;
      } else {
        error = 'Error al crear grupo';
      }
    } catch {
      error = 'Error de conexión';
    } finally {
      saving = false;
    }
  }
</script>

<svelte:head>
  <title>Split — Nuevo grupo</title>
</svelte:head>

<div style="margin-bottom: 12px;">
  <a href="/groups" style="font-size: 10px; color: var(--text3); letter-spacing: 0.05em;">← Grupos</a>
</div>

<div class="section-header" style="margin-bottom: 16px;">Nuevo grupo</div>

{#if error}
  <div style="background: rgba(255,77,106,0.1); border: 1px solid rgba(255,77,106,0.2); border-radius: 6px; padding: 10px 14px; margin-bottom: 12px; font-size: 12px; color: var(--red);">
    {error}
  </div>
{/if}

<!-- Emoji Picker -->
<div class="form-group">
  <label>Icono</label>
  <div style="display: flex; flex-wrap: wrap; gap: 6px;">
    {#each emojiList as e}
      <button
        onclick={() => emoji = e}
        style="width: 38px; height: 38px; border-radius: 8px; border: 1px solid {emoji === e ? 'var(--gold)' : 'var(--border)'}; background: {emoji === e ? 'rgba(201,168,76,0.1)' : 'var(--bg2)'}; cursor: pointer; font-size: 18px; display: flex; align-items: center; justify-content: center; transition: all 0.15s;"
      >
        {e}
      </button>
    {/each}
  </div>
</div>

<div class="form-group">
  <label for="name">Nombre del grupo</label>
  <input id="name" type="text" placeholder="Ej: Viaje a Lisboa" bind:value={name} />
</div>

<!-- Default Currency -->
<div class="form-group">
  <label for="currency">Moneda predeterminada</label>
  <select id="currency" bind:value={defaultCurrency}>
    {#each data.currencies as curr}
      <option value={curr}>{curr}</option>
    {/each}
  </select>
  <div style="font-size: 10px; color: var(--text3); margin-top: 4px;">Los gastos de este grupo se registrarán en esta moneda</div>
</div>

<!-- Members -->
<div class="form-group">
  <label>Miembros</label>
  <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px;">
    {#each data.people as person}
      <button
        onclick={() => toggleMember(person.id)}
        style="display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 20px; border: 1px solid {selectedMembers.includes(person.id) ? 'var(--gold)' : 'var(--border)'}; background: {selectedMembers.includes(person.id) ? 'rgba(201,168,76,0.1)' : 'transparent'}; cursor: pointer; color: {selectedMembers.includes(person.id) ? 'var(--gold)' : 'var(--text3)'}; font-family: inherit; font-size: 11px; transition: all 0.15s;"
      >
        <span style="width: 20px; height: 20px; border-radius: 50%; background: {person.avatar_color}; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 700; color: #0a0d14;">{person.name[0]}</span>
        {person.name} {person.is_self ? '(tú)' : ''}
      </button>
    {/each}
  </div>

  <!-- Add new person inline -->
  <div style="display: flex; gap: 6px;">
    <input type="text" inputmode="text" placeholder="Añadir persona..." bind:value={newMemberName} style="flex: 1;" />
    <button class="btn-ghost" onclick={addMember} style="white-space: nowrap;">+ Añadir</button>
  </div>
</div>

<div style="margin-top: 20px;">
  <button class="btn-gold" style="width: 100%; padding: 12px;" onclick={submit} disabled={saving}>
    {saving ? 'Creando...' : 'Crear grupo'}
  </button>
</div>

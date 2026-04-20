<script lang="ts">
  let { data } = $props();

  let name = $state(data.group.name);
  let emoji = $state(data.group.emoji);
  let selectedMembers = $state<string[]>(data.memberIds);
  let newMemberName = $state('');
  let saving = $state(false);
  let error = $state('');

  function toggleMember(id: string) {
    if (selectedMembers.includes(id)) {
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
      const person = await res.json();
      selectedMembers = [...selectedMembers, person.id];
      newMemberName = '';
      // Reload to get new user in allUsers
      window.location.reload();
    }
  }

  async function submit() {
    if (!name || selectedMembers.length === 0) {
      error = 'Añade nombre y al menos un miembro';
      return;
    }
    saving = true;
    try {
      const res = await fetch(`/api/groups/${data.group.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, emoji, memberIds: selectedMembers })
      });
      if (res.ok) {
        window.location.href = `/groups/${data.group.id}`;
      } else {
        error = 'Error al guardar';
      }
    } catch { error = 'Error de conexión'; }
    finally { saving = false; }
  }
</script>

<svelte:head>
  <title>Split — Editar grupo</title>
</svelte:head>

<div style="margin-bottom: 12px;">
  <a href="/groups/{data.group.id}" style="font-size: 10px; color: var(--text3); letter-spacing: 0.05em; display: inline-flex; align-items: center; gap: 4px;">← Volver</a>
</div>

<div class="section-header" style="margin-bottom: 16px;">Editar grupo</div>

{#if error}
  <div style="background: rgba(255,77,106,0.1); border: 1px solid rgba(255,77,106,0.2); border-radius: 6px; padding: 10px 14px; margin-bottom: 12px; font-size: 12px; color: var(--red);">{error}</div>
{/if}

<div class="form-group">
  <label>Emoji</label>
  <input type="text" bind:value={emoji} style="font-size: 28px; text-align: center; padding: 10px;" />
</div>

<div class="form-group">
  <label>Nombre</label>
  <input type="text" bind:value={name} placeholder="Nombre del grupo" />
</div>

<div class="form-group">
  <label>Miembros</label>
  <div style="display: flex; flex-wrap: wrap; gap: 6px;">
    {#each data.allUsers as user}
      <button onclick={() => toggleMember(user.id)}
        style="display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 20px; border: 1px solid {selectedMembers.includes(user.id) ? 'var(--gold)' : 'var(--border)'}; background: {selectedMembers.includes(user.id) ? 'rgba(201,168,76,0.1)' : 'transparent'}; cursor: pointer; color: {selectedMembers.includes(user.id) ? 'var(--gold)' : 'var(--text3)'}; font-family: inherit; font-size: 11px;">
        <span style="width: 20px; height: 20px; border-radius: 50%; background: {user.avatar_color}; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 700; color: #0a0d14;">{user.name[0]}</span>
        {user.name} {user.is_self ? '(tú)' : ''}
      </button>
    {/each}
  </div>
</div>

<div class="form-group">
  <label>Añadir persona nueva</label>
  <div style="display: flex; gap: 8px;">
    <input type="text" bind:value={newMemberName} placeholder="Nombre..." style="flex: 1;" />
    <button class="btn-gold" style="padding: 10px 16px; font-size: 11px;" onclick={addMember}>Añadir</button>
  </div>
</div>

<div style="margin-top: 20px;">
  <button class="btn-gold" style="width: 100%; padding: 12px;" onclick={submit} disabled={saving}>
    {saving ? 'Guardando...' : 'Guardar cambios'}
  </button>
</div>

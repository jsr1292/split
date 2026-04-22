<script lang="ts">
  import { t } from '$lib/i18n/index.js';
  let { data } = $props();

  let name = $state(data.group.name);
  let emoji = $state(data.group.emoji);
  let selectedMembers = $state<string[]>(data.memberIds);
  let newMemberName = $state('');
  let currencyMode = $state(data.group.currency_mode || 'single');
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
      error = t('at_least_2_people');
      return;
    }
    saving = true;
    try {
      const res = await fetch(`/api/groups/${data.group.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, emoji, memberIds: selectedMembers, currencyMode })
      });
      if (res.ok) {
        window.location.href = `/groups/${data.group.id}`;
      } else {
        error = t('error_saving');
      }
    } catch { error = t('connection_error'); }
    finally { saving = false; }
  }
</script>

<svelte:head>
  <title>Splitrr — {t('editing_group')}</title>
</svelte:head>

<div style="margin-bottom: 12px;">
  <a href="/groups/{data.group.id}" style="font-size: 12px; color: var(--text3); letter-spacing: 0.05em; display: inline-flex; align-items: center; gap: 4px;">← {t('back')}</a>
</div>

<div class="section-header" style="margin-bottom: 16px;">{t('editing_group')}</div>

{#if error}
  <div style="background: rgba(255,77,106,0.1); border: 1px solid rgba(255,77,106,0.2); border-radius: 6px; padding: 10px 14px; margin-bottom: 12px; font-size: 12px; color: var(--red);">{error}</div>
{/if}

<div class="form-group">
  <label>{t('group_icon')}</label>
  <input type="text" bind:value={emoji} style="font-size: 28px; text-align: center; padding: 10px;" />
</div>

<div class="form-group">
  <label>{t('group_name')}</label>
  <input type="text" bind:value={name} placeholder={t('group_name_placeholder')} maxlength="50" />
</div>

<!-- Currency Mode -->
<div class="form-group">
  <label>Currency Mode</label>
  <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 4px;">
    <label style="display: flex; align-items: flex-start; gap: 8px; padding: 10px 12px; border-radius: 8px; border: 1px solid {currencyMode === 'single' ? '#72D2A2' : 'var(--border)'}; background: {currencyMode === 'single' ? 'rgba(114,210,162,0.08)' : 'transparent'}; cursor: pointer; font-size: 13px;">
      <input type="radio" name="currencyMode" value="single" bind:group={currencyMode} style="accent-color: #72D2A2; margin-top: 2px; flex-shrink: 0;" />
      <div style="flex: 1; min-width: 0; word-break: break-word;">
        <div style="font-weight: 600; color: var(--text);">Single currency</div>
        <div style="font-size: 11px; color: var(--text3); margin-top: 2px;">All balances in {data.group.currency || 'EUR'}. Simple and easy.</div>
      </div>
    </label>
    <label style="display: flex; align-items: flex-start; gap: 8px; padding: 10px 12px; border-radius: 8px; border: 1px solid {currencyMode === 'fx_lock' ? '#72D2A2' : 'var(--border)'}; background: {currencyMode === 'fx_lock' ? 'rgba(114,210,162,0.08)' : 'transparent'}; cursor: pointer; font-size: 13px;">
      <input type="radio" name="currencyMode" value="fx_lock" bind:group={currencyMode} style="accent-color: #72D2A2; margin-top: 2px; flex-shrink: 0;" />
      <div style="flex: 1; min-width: 0; word-break: break-word;">
        <div style="font-weight: 600; color: var(--text);">Fair FX</div>
        <div style="font-size: 11px; color: var(--text3); margin-top: 2px;">Exchange rates locked when expense is added. Fair for mixed currencies.</div>
      </div>
    </label>
  </div>
  {#if currencyMode !== (data.group.currency_mode || 'single')}
    <div style="margin-top: 8px; font-size: 11px; color: #72D2A2; background: rgba(114,210,162,0.08); border: 1px solid rgba(114,210,162,0.2); border-radius: 6px; padding: 8px 10px;">⚠ Balances will be recalculated using the new mode. All historical FX data is preserved.</div>
  {/if}
</div>

<div class="form-group">
  <label>{t('group_members')}</label>
  <div style="display: flex; flex-wrap: wrap; gap: 6px;">
    {#each data.allUsers as user}
      <button onclick={() => toggleMember(user.id)}
        style="display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 20px; border: 1px solid {selectedMembers.includes(user.id) ? 'var(--gold)' : 'var(--border)'}; background: {selectedMembers.includes(user.id) ? 'rgba(201,168,76,0.1)' : 'transparent'}; cursor: pointer; color: {selectedMembers.includes(user.id) ? 'var(--gold)' : 'var(--text3)'}; font-family: inherit; font-size: 11px;">
        <span style="width: 20px; height: 20px; border-radius: 50%; background: {user.avatar_color}; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: #0a0d14;">{user.name[0]}</span>
        {user.name} {user.is_self ? t('you') : ''}
      </button>
    {/each}
  </div>
</div>

<div class="form-group">
  <label>{t('add_new_person')}</label>
  <div style="display: flex; gap: 8px;">
    <input type="text" bind:value={newMemberName} placeholder={t('name_placeholder')} style="flex: 1;" />
    <button class="btn-gold" style="padding: 10px 16px; font-size: 11px;" onclick={addMember}>{t('add')}</button>
  </div>
</div>

<div style="margin-top: 20px;">
  <button class="btn-gold" style="width: 100%; padding: 12px;" onclick={submit} disabled={saving}>
    {saving ? t('saving') : t('save_changes')}
  </button>
</div>

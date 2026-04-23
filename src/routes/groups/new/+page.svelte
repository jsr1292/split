<script lang="ts">
  import { t, getLocale } from '$lib/i18n/index.js';
  let { data } = $props();

  const emojiList = ['🏠', '✈️', '🏖️', '🍕', '🎯', '🎄', '💍', '🚗', '⚽', '🎮', '🍻', '🎵', '🏔️', '🚢', '🎪'];

  let name = $state('');
  let emoji = $state('🏠');
  let defaultCurrency = $state('EUR');
  let currencyMode = $state('single');
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
      error = t('at_least_2_people');
      return;
    }
    saving = true;
    error = '';

    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), emoji, memberIds: selectedMembers, defaultCurrency, currencyMode })
      });
      if (res.ok) {
        const group = await res.json();
        window.location.href = `/groups/${group.id}`;
      } else {
        error = t('error_creating');
      }
    } catch {
      error = t('connection_error');
    } finally {
      saving = false;
    }
  }
</script>

<svelte:head>
  <title>Splitrr — {t('new_group')}</title>
</svelte:head>

<div style="margin-bottom: 12px;">
  <a href="/groups" style="font-size: 12px; color: var(--text3); letter-spacing: 0.05em;">← {t('groups')}</a>
</div>

<div class="section-header" style="margin-bottom: 16px;">{t('new_group')}</div>

{#if error}
  <div style="background: rgba(255,77,106,0.1); border: 1px solid rgba(255,77,106,0.2); border-radius: 6px; padding: 10px 14px; margin-bottom: 12px; font-size: 12px; color: var(--red);">
    {error}
  </div>
{/if}

<!-- Emoji Picker -->
<div class="form-group">
  <label>{t('group_icon')}</label>
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
  <label for="name">{t('group_name')}</label>
  <input id="name" type="text" placeholder={t('group_name_placeholder')} bind:value={name} />
</div>

<!-- Default Currency -->
<div class="form-group">
  <label for="currency">{t('default_currency')}</label>
  <select id="currency" bind:value={defaultCurrency}>
    {#each data.currencies as curr}
      <option value={curr}>{curr}</option>
    {/each}
  </select>
  <div style="font-size: 12px; color: var(--text3); margin-top: 4px;">{t('currency_hint')}</div>
</div>

<!-- Currency Mode -->
<div class="form-group">
  <label>Currency Mode</label>
  <select bind:value={currencyMode} style="width:100%;">
    <option value="single">Single currency — All balances in {defaultCurrency}</option>
    <option value="fx_lock">Fair FX — Exchange rates locked when expense is added</option>
  </select>
  <div style="font-size: 11px; color: var(--text3); margin-top: 4px;">{currencyMode === 'fx_lock' ? 'Each share converted at the rate when expense was created. Fair for mixed currencies.' : 'Simple and easy. All balances in one currency.'}</div>
</div>

<!-- Members -->
<div class="form-group">
  <label>{t('group_members')}</label>
  <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px;">
    {#each data.people as person}
      <button
        onclick={() => toggleMember(person.id)}
        style="display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 20px; border: 1px solid {selectedMembers.includes(person.id) ? 'var(--gold)' : 'var(--border)'}; background: {selectedMembers.includes(person.id) ? 'rgba(201,168,76,0.1)' : 'transparent'}; cursor: pointer; color: {selectedMembers.includes(person.id) ? 'var(--gold)' : 'var(--text3)'}; font-family: inherit; font-size: 11px; transition: all 0.15s;"
      >
        <span style="width: 20px; height: 20px; border-radius: 50%; background: {person.avatar_color}; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: var(--avatar-text);">{person.name[0]}</span>
        {person.name} {person.is_self ? t('you') : ''}
      </button>
    {/each}
  </div>

  <!-- Add new person inline -->
  <div style="display: flex; gap: 6px;">
    <input type="text" inputmode="text" placeholder={t('add_person')} bind:value={newMemberName} style="flex: 1;" />
    <button class="btn-ghost" onclick={addMember} style="white-space: nowrap;">+ {t('add')}</button>
  </div>
</div>

<div style="margin-top: 20px;">
  <button class="btn-gold" style="width: 100%; padding: 12px;" onclick={submit} disabled={saving}>
    {saving ? t('creating_group') : t('create_group_btn')}
  </button>
</div>

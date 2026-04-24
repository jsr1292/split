<script lang="ts">
  import { t } from '$lib/i18n/index.js';
  let { data } = $props();

  let selectedGhostId = $state<string | null>(null);
  let claiming = $state(false);
  let skipClaiming = $state(false);
  let error = $state('');

  async function claimGhost() {
    if (!selectedGhostId) return;
    claiming = true;
    error = '';
    try {
      const res = await fetch(`/api/groups/${data.group.id}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ghostUserId: selectedGhostId })
      });
      if (res.ok) {
        window.location.href = `/groups/${data.group.id}`;
      } else {
        const body = await res.json();
        error = body.error || t('join_error');
      }
    } catch {
      error = t('connection_error');
    } finally {
      claiming = false;
    }
  }

  async function skipAndJoin() {
    skipClaiming = true;
    window.location.href = `/groups/${data.group.id}`;
  }
</script>

<svelte:head>
  <title>Splitrr — {t('join_group')}</title>
</svelte:head>

<div style="margin-bottom: 12px;">
  <a href="/groups" style="font-size: 12px; color: var(--text3); letter-spacing: 0.05em; display: inline-flex; align-items: center; gap: 4px;">← {t('back')}</a>
</div>

<div class="section-header" style="margin-bottom: 16px;">{t('join_group')}</div>

{#if data.ghostUsers && data.ghostUsers.length > 0}
  <div style="margin-bottom: 20px;">
    <p style="font-size: 12px; color: var(--text3); margin-bottom: 16px;">
      {t('ghost_claim_prompt')}
    </p>

    {#if error}
      <div style="background: rgba(255,77,106,0.1); border: 1px solid rgba(255,77,106,0.2); border-radius: 6px; padding: 10px 14px; margin-bottom: 12px; font-size: 12px; color: var(--red);">
        {error}
      </div>
    {/if}

    <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px;">
      {#each data.ghostUsers as ghost}
        <button
          onclick={() => selectedGhostId = ghost.id}
          style="display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 10px; border: 1px solid {selectedGhostId === ghost.id ? 'var(--gold)' : 'var(--border)'}; background: {selectedGhostId === ghost.id ? 'rgba(201,168,76,0.1)' : 'var(--glass)'}; cursor: pointer; width: 100%; text-align: left; color: inherit; font-family: inherit;"
        >
          <div class="avatar" style="background: {ghost.avatar_color};">{ghost.name[0]}</div>
          <div style="flex: 1;">
            <div style="font-size: 12px; font-weight: 600;">{ghost.name} 👻</div>
          </div>
          <div style="width: 20px; height: 20px; border-radius: 50%; border: 2px solid {selectedGhostId === ghost.id ? 'var(--gold)' : 'var(--border)'}; background: {selectedGhostId === ghost.id ? 'var(--gold)' : 'transparent'}; display: flex; align-items: center; justify-content: center;">
            {#if selectedGhostId === ghost.id}
              <div style="width: 8px; height: 8px; border-radius: 50%; background: var(--bg);"></div>
            {/if}
          </div>
        </button>
      {/each}
    </div>

    <div style="display: flex; gap: 8px;">
      <button class="btn-gold" style="flex: 1; padding: 12px;" onclick={claimGhost} disabled={!selectedGhostId || claiming}>
        {claiming ? t('joining_group') : t('thats_me')}
      </button>
      <button class="btn-ghost" style="padding: 12px;" onclick={skipAndJoin}>
        {t('im_new')}
      </button>
    </div>
  </div>
{:else}
  <div style="text-align: center; padding: 40px 20px;">
    <div style="font-size: 48px; margin-bottom: 16px;">👻</div>
    <p style="font-size: 12px; color: var(--text3);">{t('joining_group')}</p>
  </div>
{/if}

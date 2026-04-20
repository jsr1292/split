<script lang="ts">
  let { data } = $props();
</script>

<svelte:head>
  <title>Split — Personas</title>
</svelte:head>

<div class="section-header" style="margin-bottom: 12px;">Personas</div>

{#each data.people as person}
  <div class="glass-card" style="display: flex; align-items: center; gap: 12px;">
    <div class="avatar" style="background: {person.avatar_color}; width: 32px; height: 32px; font-size: 13px;">
      {person.name[0]}
    </div>
    <div style="flex: 1;">
      <div style="font-weight: 600; font-size: 13px;">{person.name} {person.is_self ? '(tú)' : ''}</div>
      {#if person.email}
        <div style="font-size: 9px; color: var(--text3); letter-spacing: 0.05em;">{person.email}</div>
      {/if}
    </div>
  </div>
{:else}
  <div style="text-align: center; padding: 40px 20px; color: var(--text3); font-size: 12px;">
    Sin personas registradas
  </div>
{/each}

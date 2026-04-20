<script lang="ts">
  let { data } = $props();
</script>

<svelte:head>
  <title>Split — Personas</title>
</svelte:head>

<div style="margin-bottom: 12px;">
  <a href="/" style="font-size: 10px; color: var(--text3); letter-spacing: 0.05em; display: inline-flex; align-items: center; gap: 4px;">← Inicio</a>
</div>

<div class="section-header" style="margin-bottom: 16px;">Personas</div>

<div style="display: flex; flex-direction: column; gap: 6px;">
  {#each data.people as p}
    <a href="/people/{p.id}">
      <div class="glass-card" style="display: flex; align-items: center; gap: 12px; padding: 12px 14px;">
        <div class="avatar" style="background: {p.avatar_color};">{p.name[0]}</div>
        <div style="flex: 1;">
          <div style="font-size: 12px; font-weight: 600;">{p.name} {p.is_self ? '(tú)' : ''}</div>
          <div style="font-size: 9px; color: var(--text3);">{p.email || ''}</div>
        </div>
        <div style="color: var(--text3); font-size: 12px;">→</div>
      </div>
    </a>
  {/each}
</div>

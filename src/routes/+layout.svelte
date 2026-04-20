<script lang="ts">
  import '../app.css';
  import { page } from '$app/stores';
  import { browser } from '$app/environment';
  let { children, data } = $props();

  if (browser && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  let currentPath = $state('');
  $effect(() => { currentPath = $page.url.pathname; });
  let showFab = $derived(currentPath && !currentPath.includes('/expense/new') && !currentPath.includes('/edit') && !currentPath.includes('/groups/new'));
  let fabHref = $derived(() => {
    const match = currentPath.match(/^\/groups\/([\w-]+)$/);
    if (match) return `/expense/new?group=${match[1]}`;
    return '/expense/new';
  });

  function isActive(path: string) {
    if (path === '/') return currentPath === '/';
    return currentPath.startsWith(path);
  }

  const navItems = [
    { path: '/', label: 'Inicio', icon: 'home' },
    { path: '/groups', label: 'Grupos', icon: 'users' },
    { path: '/people', label: 'Personas', icon: 'user' },
  ];
</script>

<div style="background: var(--bg); min-height: 100dvh; padding-bottom: 80px;">

  <!-- Header -->
  <div class="site-top">
    <header class="site-header">
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 18px;">💰</span>
        <span class="logo-text">Split</span>
      </div>
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 10px; color: var(--text3); letter-spacing: 0.05em;">{data.user?.name || ''}</span>
        <div class="avatar" style="background: var(--gold);">{data.user?.name?.[0] || '?'}</div>
      </div>
    </header>
  </div>

  <!-- Content -->
  <div class="page-container">
    {@render children()}
  </div>

  <!-- Bottom Nav -->
  <nav class="bottom-nav">
    {#each navItems as item}
      <a href={item.path}>
        <button class:active={isActive(item.path)}>
          {#if item.icon === 'home'}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h3a1 1 0 001-1V10" stroke-linecap="round" stroke-linejoin="round"/></svg>
          {:else if item.icon === 'users'}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zm14 10v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke-linecap="round" stroke-linejoin="round"/></svg>
          {:else}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" stroke-linecap="round" stroke-linejoin="round"/></svg>
          {/if}
          <span>{item.label}</span>
        </button>
      </a>
    {/each}
  </nav>

  <!-- FAB -->
  <a href={fabHref()} class="btn-fab" style="{showFab ? '' : 'display: none;'}" title="Añadir gasto">+</a>
</div>

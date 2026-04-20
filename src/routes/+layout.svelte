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

  function isActive(path: string) {
    if (path === '/') return currentPath === '/';
    return currentPath.startsWith(path);
  }

  const navItems = [
    { path: '/', label: 'Inicio', icon: 'home' },
    { path: '/groups', label: 'Grupos', icon: 'users' },
    { path: '/expense/new', label: '+', icon: 'plus' },
    { path: '/people', label: 'Personas', icon: 'user' },
    { path: '/settings', label: 'Ajustes', icon: 'settings' },
  ];
</script>

<div style="background: var(--bg); min-height: 100dvh; padding-bottom: 80px;">

  <!-- Header -->
  <div class="site-top">
    <header class="site-header">
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 20px;">💰</span>
        <span style="font-weight: 700; font-size: 15px; color: var(--gold);">Split</span>
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <span class="text-xs text-muted">{data.user?.name || ''}</span>
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
          {:else if item.icon === 'plus'}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
          {:else if item.icon === 'user'}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" stroke-linecap="round" stroke-linejoin="round"/></svg>
          {:else}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
          {/if}
          <span>{item.label}</span>
        </button>
      </a>
    {/each}
  </nav>
</div>

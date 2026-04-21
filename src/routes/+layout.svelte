<script lang="ts">
  import '../app.css';
  import { page } from '$app/stores';
  import { browser } from '$app/environment';
  import { t, setLang, getLang, getLangLabel } from '$lib/i18n/index.js';
  let { children, data } = $props();

  let currentTheme = $state('dark');
  let pwaTopOffset = $state(0);

  if (browser) {
    currentTheme = localStorage.getItem('split-theme') || 'dark';
  }

  // Fix PWA safe-area inset: visualViewport.offsetTop corrects the levitation issue
  // that occurs in iOS standalone PWA where env(safe-area-inset-top) reports 0 on first load
  $effect(() => {
    if (!browser || !visualViewport) return;
    function update() {
      pwaTopOffset = visualViewport!.offsetTop;
      document.documentElement.style.setProperty('--pwa-top', Math.max(12, pwaTopOffset) + 'px');
    }
    visualViewport.addEventListener('resize', update);
    visualViewport.addEventListener('scroll', update);
    update();
    return () => {
      visualViewport!.removeEventListener('resize', update);
      visualViewport!.removeEventListener('scroll', update);
    };
  });

  function cycleTheme() {
    const themes = ['dark', 'oled', 'light'];
    const i = themes.indexOf(currentTheme);
    currentTheme = themes[(i + 1) % themes.length];
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('split-theme', currentTheme);
    const colors: Record<string,string> = { dark: '#07090f', oled: '#000000', light: '#f5f3ee' };
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', colors[currentTheme]);
  }

  const themeIcons: Record<string,string> = { dark: '🌙', oled: '⬛', light: '☀️' };

  let currentPath = $state('');
  $effect(() => { currentPath = $page.url.pathname; });
  let showFab = $derived(currentPath && !currentPath.includes('/expense/new') && !currentPath.includes('/edit') && !currentPath.includes('/groups/new') && !currentPath.includes('/auth'));
  let fabHref = $derived(() => {
    const match = currentPath.match(/^\/groups\/([\w-]+)$/);
    if (match) return `/expense/new?group=${match[1]}`;
    return '/expense/new';
  });
  let isAuthPage = $derived(currentPath.startsWith('/auth'));
  let showUserMenu = $state(false);

  $effect(() => {
    if (!showUserMenu) return;
    function handler(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest('.user-menu-trigger') && !target.closest('.user-menu-dropdown')) {
        showUserMenu = false;
      }
    }
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  });

  function isActive(path: string) {
    if (path === '/') return currentPath === '/';
    return currentPath.startsWith(path);
  }

  // Track module-level lang as local $state so template reactivity works
  let currentLang = $state(getLang());
  $effect(() => {
    currentLang; // subscribe
    // Sync with module-level lang on init
    const sync = () => { currentLang = getLang(); };
    // Watch for lang changes from cycleLang
    const interval = setInterval(sync, 50);
    return () => clearInterval(interval);
  });

  // Nav labels — derived reactively, no {#key} needed
  const navLabels = $derived([
    { path: '/', icon: 'home', label: currentLang === 'en' ? 'Home' : 'Inicio' },
    { path: '/groups', icon: 'users', label: currentLang === 'en' ? 'Groups' : 'Grupos' },
    { path: '/people', icon: 'user', label: currentLang === 'en' ? 'People' : 'Personas' },
  ]);
  const navIcons: Record<string, string> = {
    home: '🏠',
    users: '👥',
    user: '👤',
  };

  function cycleLang() {
    const next = currentLang === 'es' ? 'en' : 'es';
    setLang(next);
    currentLang = next;
  }

  // Offline badge
  let isOnline = $state(true);
  let toast = $state<{ message: string; type: 'success' | 'info' } | null>(null);
  let toastTimeout: ReturnType<typeof setTimeout>;

  if (browser) {
    isOnline = navigator.onLine;
    window.addEventListener('online', () => { isOnline = true; });
    window.addEventListener('offline', () => { isOnline = false; });

    // Listen for sync complete from service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (e) => {
        if (e.data.type === 'SYNC_COMPLETE') {
          showToast(t('synced'), 'success');
          // Reload to show new data
          window.location.reload();
        }
      });
    }
  }

  function showToast(message: string, type: 'success' | 'info' = 'success') {
    clearTimeout(toastTimeout);
    toast = { message, type };
    toastTimeout = setTimeout(() => { toast = null; }, 3000);
  }

  // Expose showToast globally for use by pages
  if (browser) {
    (window as any).showOfflineToast = () => showToast(t('saved_locally'), 'info');
  }
</script>

<!-- Auth pages: no nav, no header, no fixed UI -->
{#if isAuthPage}
  <div style="background: var(--bg); height: 100vh;">
    {@render children()}
  </div>

{:else}
  <!-- Main app: flex column, header + content -->
  <div style="background: var(--bg); height: 100vh; padding-bottom: 0; display: flex; flex-direction: column;">

    <!-- Header -->
    <div class="site-top">
      <header class="site-header">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 18px;">💰</span>
          <span class="logo-text">Split</span>
        </div>
        <div style="display: flex; align-items: center; gap: 12px;">
          <a href="/search" style="color: var(--text3);">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" stroke-linecap="round"/></svg>
          </a>
          {#if !isOnline}
            {#key langKey}<span style="background: rgba(255,77,106,0.15); border: 1px solid rgba(255,77,106,0.3); border-radius: 4px; padding: 2px 6px; font-size: 8px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--red);">{t('offline')}</span>{/key}
          {/if}
          <button class="theme-toggle" onclick={cycleTheme}>{themeIcons[currentTheme]}</button>
          <button onclick={cycleLang} style="background: none; border: none; cursor: pointer; color: var(--gold); font-size: 11px; letter-spacing: 0.1em; padding: 2px 4px;" title={t('language')}>🌐 {getLangLabel()}</button>
          <span style="font-size: 12px; color: var(--text3); letter-spacing: 0.05em;">{data.user?.name || ''}</span>
          <div class="avatar user-menu-trigger" style="background: var(--gold); cursor: pointer; position: relative;" onclick={() => showUserMenu = !showUserMenu} role="button" tabindex="0" onkeydown={(e) => e.key === 'Enter' && (showUserMenu = !showUserMenu)}>{data.user?.name?.[0] || '?'}</div>
          {#if showUserMenu}
            <div class="user-menu-dropdown glass-card" style="position: absolute; top: 56px; right: 16px; background: var(--bg2); border: 1px solid var(--glass-border); border-radius: 8px; padding: 6px; z-index: 300; min-width: 140px;">
              <div style="font-size: 12px; color: var(--text3); padding: 4px 8px 6px;">{data.user?.email || ''}</div>
              <div class="gold-divider" style="margin: 4px 0;"></div>
              <form method="POST" action="/auth/logout" style="margin: 0;">
                <button type="submit" style="background: none; border: none; color: var(--text2); font-size: 12px; cursor: pointer; width: 100%; text-align: left; padding: 6px 8px; display: flex; align-items: center; gap: 6px; border-radius: 4px;" onmouseover={(e) => (e.currentTarget as HTMLElement).style.background='var(--glass-border)'} onmouseout={(e) => (e.currentTarget as HTMLElement).style.background='none'}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  {#key langKey}{t('logout')}{/key}
                </button>
              </form>
            </div>
          {/if}
        </div>
      </header>
    </div>

    <!-- Content -->
    <div class="page-container">
      {@render children()}
    </div>

  </div>

  <!-- Bottom Nav — OUTSIDE the flex wrapper so position:fixed is truly viewport-relative -->
  <nav class="bottom-nav">
    {#each navLabels as item}
      <a href={item.path}>
        <button class:active={isActive(item.path)} style={isActive(item.path) ? 'color: var(--gold); transform: scale(1.1);' : 'color: var(--text3); transform: scale(1);'}>
          <span style="font-size: 16px; line-height: 1;">{navIcons[item.icon]}</span>
          <span>{item.label}</span>
        </button>
      </a>
    {/each}
  </nav>

  <!-- FAB -->
  <a href={fabHref()} class="btn-fab" style="{showFab ? '' : 'display: none;'}" title={currentLang === 'en' ? 'Add expense' : 'Añadir gasto'}>+</a>

  <!-- Toast -->
  {#if toast}
    <div style="position: fixed; top: {`calc(56px + max(env(safe-area-inset-top), 12px) + 8px)`}; left: 50%; transform: translateX(-50%); z-index: 500; background: {toast.type === 'success' ? 'rgba(0,229,160,0.15)' : 'rgba(201,168,76,0.15)'}; border: 1px solid {toast.type === 'success' ? 'rgba(0,229,160,0.3)' : 'rgba(201,168,76,0.3)'}; border-radius: 8px; padding: 8px 16px; font-size: 11px; color: {toast.type === 'success' ? 'var(--green)' : 'var(--gold)'}; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); transition: opacity: 0.2s;" role="status">
      {toast.message}
    </div>
  {/if}
{/if}

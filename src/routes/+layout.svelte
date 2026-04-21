<script lang="ts">
  import '../app.css';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import { t, setLang, getLang, getLangLabel } from '$lib/i18n/index.js';
  let { children, data } = $props();

  let currentTheme = $state('dark');
  let pwaTopOffset = $state(0);

  // Track keyboard state for operator bar visibility
  $effect(() => {
    if (!browser) return;
    function onResize() {
      const isOpen = visualViewport ? visualViewport.height < window.innerHeight * 0.85 : false;
      document.body.classList.toggle('keyboard-open', isOpen);
    }
    if (visualViewport) {
      visualViewport.addEventListener('resize', onResize);
      onResize();
    }
    return () => { visualViewport?.removeEventListener('resize', onResize); };
  });

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

  function haptic() { if (navigator.vibrate) navigator.vibrate(10); }

  function cycleTheme() {
    haptic();
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

  // Page transitions: track previous path for direction
  let prevPath = $state('');
  let pageKey = $state('');
  $effect(() => {
    const p = $page.url.pathname;
    if (prevPath && p !== prevPath) {
      pageKey = p;
    } else if (!prevPath) {
      pageKey = p;
    }
    prevPath = p;
  });

  // Swipe to go back (edge swipe)
  let edgeSwipeX = $state<number | null>(null);
  $effect(() => {
    if (!browser) return;
    let startX = 0;
    let startY = 0;
    let started = false;
    function onTouchStart(e: TouchEvent) {
      const t2 = e.touches[0];
      if (t2.clientX < 30) {
        startX = t2.clientX;
        startY = t2.clientY;
        started = true;
        edgeSwipeX = 0;
      }
    }
    function onTouchMove(e: TouchEvent) {
      if (!started || edgeSwipeX === null) return;
      const dx = e.touches[0].clientX - startX;
      const dy = Math.abs(e.touches[0].clientY - startY);
      if (dx > 0) {
        edgeSwipeX = Math.min(dx, 80);
        e.preventDefault();
      }
    }
    function onTouchEnd() {
      if (started && edgeSwipeX !== null && edgeSwipeX > 60) {
        window.history.back();
      }
      started = false;
      edgeSwipeX = null;
    }
    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  });

  // Tab swipe (Home /groups /people)
  const tabPaths = ['/', '/groups', '/people'];
  $effect(() => {
    if (!browser) return;
    let startX = 0;
    let startY = 0;
    let active = false;
    function onTouchStart(e: TouchEvent) {
      const t2 = e.touches[0];
      const path = $page.url.pathname;
      if (tabPaths.includes(path)) {
        startX = t2.clientX;
        startY = t2.clientY;
        active = true;
      }
    }
    function onTouchEnd(e: TouchEvent) {
      if (!active) return;
      active = false;
      const dx = e.changedTouches[0].clientX - startX;
      const dy = Math.abs(e.changedTouches[0].clientY - startY);
      if (Math.abs(dx) > 80 && Math.abs(dy) < Math.abs(dx) * 0.6) {
        const idx = tabPaths.indexOf($page.url.pathname);
        if (dx < 0 && idx < tabPaths.length - 1) {
          goto(tabPaths[idx + 1]);
        } else if (dx > 0 && idx > 0) {
          goto(tabPaths[idx - 1]);
        }
      }
    }
    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchend', onTouchEnd);
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchend', onTouchEnd);
    };
  });
  let showFab = $derived(currentPath && !currentPath.includes('/expense/new') && !currentPath.includes('/edit') && !currentPath.includes('/groups/new') && !currentPath.includes('/auth') && !currentPath.includes('/search'));
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

  // Contextual header: toolbar title + back arrow
  let showBack = $derived(
    currentPath.match(/^\/groups\/[\w-]+$/) !== null ||
    currentPath.match(/^\/expense\/(new|[\w-]+\/edit)$/) !== null
  );
  let toolbarTitle = $derived(() => {
    if (currentPath === '/') return 'Splitrr';
    if (currentPath === '/groups') return currentLang === 'en' ? 'Groups' : 'Grupos';
    if (currentPath === '/people') return currentLang === 'en' ? 'People' : 'Personas';
    if (currentPath.match(/^\/groups\/[\w-]+$/)) return '';
    if (currentPath.match(/^\/expense\/new/)) return currentLang === 'en' ? 'Add Expense' : 'Añadir Gasto';
    if (currentPath.match(/^\/expense\/[\w-]+\/edit$/)) return currentLang === 'en' ? 'Edit Expense' : 'Editar Gasto';
    if (currentPath === '/search') return currentLang === 'en' ? 'Search' : 'Buscar';
    return 'Splitrr';
  });
  let isSearchPage = $derived(currentPath === '/search');

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

  function cycleLang() {
    haptic();
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

  // Global confirm modal
  let confirmState = $state<{ message: string; resolve: (v: boolean) => void } | null>(null);
  function showConfirm(message: string): Promise<boolean> {
    return new Promise((resolve) => {
      confirmState = { message, resolve };
    });
  }
  function confirmYes() { confirmState?.resolve(true); confirmState = null; }
  function confirmNo() { confirmState?.resolve(false); confirmState = null; }

  // Expose globally for pages
  if (browser) {
    (window as any).showOfflineToast = () => showToast(t('saved_locally'), 'info');
    (window as any).showConfirm = showConfirm;
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
        <div style="display: flex; align-items: center; gap: 10px; color: var(--gold);">
          {#if showBack}
            <a href="/groups" style="color: var(--text3); display: flex; align-items: center;" aria-label="Back">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M19 12H5M12 19l-7-7 7-7" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </a>
          {:else}
            <svg width="26" height="26" viewBox="0 0 40 40" fill="none" style="flex-shrink: 0;">
              <rect x="8" y="4" width="20" height="12" rx="6" fill="currentColor" opacity="0.9"/>
              <rect x="12" y="24" width="20" height="12" rx="6" fill="currentColor" opacity="0.9"/>
            </svg>
          {/if}
          <span class="logo-text">{toolbarTitle()}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 12px;">
          {#if currentPath === '/groups'}
            <a href="/groups/new" style="color: var(--gold); font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase;" aria-label="Add group">+</a>
          {/if}
          <a href="/search" style="color: {isSearchPage ? 'var(--gold)' : 'var(--text3)'};" aria-label="Search">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" stroke-linecap="round"/></svg>
          </a>
          {#if !isOnline}
            <span style="background: rgba(255,77,106,0.15); border: 1px solid rgba(255,77,106,0.3); border-radius: 4px; padding: 2px 6px; font-size: 8px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--red);">{t('offline')}</span>
          {/if}
          <button class="theme-toggle" onclick={cycleTheme} aria-label="Toggle theme">{themeIcons[currentTheme]}</button>
          <button onclick={cycleLang} style="background: none; border: none; cursor: pointer; color: var(--gold); font-size: 11px; letter-spacing: 0.1em; padding: 2px 4px;" title={t('language')} aria-label="Switch language">🌐 {getLangLabel()}</button>
          <span style="font-size: 12px; color: var(--text3); letter-spacing: 0.05em;">{data.user?.name || ''}</span>
          <div class="avatar user-menu-trigger" style="background: var(--gold); cursor: pointer; position: relative;" onclick={() => showUserMenu = !showUserMenu} role="button" tabindex="0" onkeydown={(e) => e.key === 'Enter' && (showUserMenu = !showUserMenu)}>{data.user?.name?.[0] || '?'}</div>
          {#if showUserMenu}
            <div class="user-menu-dropdown glass-card" style="position: absolute; top: 56px; right: 16px; background: var(--bg2); border: 1px solid var(--glass-border); border-radius: 8px; padding: 6px; z-index: 300; min-width: 140px;">
              <div style="font-size: 12px; color: var(--text3); padding: 4px 8px 6px;">{data.user?.email || ''}</div>
              <div class="gold-divider" style="margin: 4px 0;"></div>
              <form method="POST" action="/auth/logout" style="margin: 0;">
                <button type="submit" style="background: none; border: none; color: var(--text2); font-size: 12px; cursor: pointer; width: 100%; text-align: left; padding: 6px 8px; display: flex; align-items: center; gap: 6px; border-radius: 4px;" onmouseover={(e) => (e.currentTarget as HTMLElement).style.background='var(--glass-border)'} onmouseout={(e) => (e.currentTarget as HTMLElement).style.background='none'}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  {t('logout')}
                </button>
              </form>
            </div>
          {/if}
        </div>
      </header>
    </div>

    <!-- Content -->
    <div class="page-container" style="transform: translateX({edgeSwipeX ?? 0}px); transition: transform 0.1s ease;">
      {#key pageKey}
        <div class="page-enter">{@render children()}</div>
      {/key}
    </div>

  </div>

  <!-- Bottom Nav — OUTSIDE the flex wrapper so position:fixed is truly viewport-relative -->
  <nav class="bottom-nav">
    {#each navLabels as item}
      <a href={item.path}>
        <button class:active={isActive(item.path)} style={isActive(item.path) ? 'color: var(--gold); transform: scale(1.1);' : 'color: var(--text3); transform: scale(1);'} onclick={haptic}>
          {#if item.icon === 'home'}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h3a1 1 0 001-1V10" stroke-linecap="round" stroke-linejoin="round"/></svg>
          {:else if item.icon === 'users'}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zm14 10v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke-linecap="round" stroke-linejoin="round"/></svg>
          {:else}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" stroke-linecap="round" stroke-linejoin="round"/></svg>
          {/if}
          <span>{item.label}</span>
        </button>
      </a>
    {/each}
  </nav>

  <!-- FAB -->
  <a href={fabHref()} class="btn-fab" style="{showFab ? '' : 'display: none;'}" title={currentLang === 'en' ? 'Add expense' : 'Añadir gasto'} aria-label="Add expense" onclick={haptic}>+</a>

  <!-- Toast -->
  {#if toast}
    <div class="toast-enter" style="position: fixed; top: {`calc(56px + max(env(safe-area-inset-top), 12px) + 8px)`}; left: 50%; transform: translateX(-50%); z-index: 500; background: {toast.type === 'success' ? 'rgba(0,229,160,0.15)' : 'rgba(201,168,76,0.15)'}; border: 1px solid {toast.type === 'success' ? 'rgba(0,229,160,0.3)' : 'rgba(201,168,76,0.3)'}; border-radius: 8px; padding: 8px 16px; font-size: 11px; color: {toast.type === 'success' ? 'var(--green)' : 'var(--gold)'}; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);" role="status">
      {toast.message}
    </div>
  {/if}
{/if}

<!-- Global Confirm Modal -->
{#if confirmState}
  <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 600; display: flex; align-items: center; justify-content: center; padding: 20px;" onclick={confirmNo}>
    <div style="background: var(--bg2); border: 1px solid var(--glass-border); border-radius: 12px; padding: 20px; max-width: 320px; width: 100%;" onclick={(e) => e.stopPropagation()}>
      <div style="font-size: 13px; margin-bottom: 16px; color: var(--text);">{confirmState.message}</div>
      <div style="display: flex; gap: 8px; justify-content: flex-end;">
        <button onclick={confirmNo} style="padding: 8px 16px; border-radius: 6px; border: 1px solid var(--border); background: var(--bg); color: var(--text3); font-size: 12px; cursor: pointer;">Cancel</button>
        <button onclick={confirmYes} style="padding: 8px 16px; border-radius: 6px; border: none; background: var(--gold); color: var(--btn-gold-text); font-size: 12px; font-weight: 600; cursor: pointer;">OK</button>
      </div>
    </div>
  </div>
{/if}

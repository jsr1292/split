<script lang="ts">
  import { t, getSystemLocale, getLang } from '$lib/i18n/index.js';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import { emptyGroupsMessage } from '$lib/microcopy.js';
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  let { data } = $props();

  // Skeleton loading state
  let isLoading = $state(true);
  $effect(() => {
    if (browser) {
      // Show skeleton briefly on mount
      const timer = setTimeout(() => { isLoading = false; }, 300);
      return () => clearTimeout(timer);
    } else {
      isLoading = false;
    }
  });

  const fmt = (n: number) => new Intl.NumberFormat(getSystemLocale(), { style: 'currency', currency: 'EUR' }).format(n);

  function getBorderColor(balance: number) {
    if (balance > 0) return 'linear-gradient(180deg, rgba(0,229,160,0.6) 0%, rgba(0,229,160,0.1) 100%)';
    if (balance < 0) return 'linear-gradient(180deg, rgba(255,77,106,0.6) 0%, rgba(255,77,106,0.1) 100%)';
    return 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%)';
  }

  function getEmojiBg(balance: number) {
    if (balance > 0) return 'rgba(0,229,160,0.15)';
    if (balance < 0) return 'rgba(255,77,106,0.15)';
    return 'rgba(201,168,76,0.15)';
  }

  // Deterministic gradient for group avatars based on group ID
  const groupGradients = [
    'linear-gradient(135deg, #f97316, #fb923c)',  // orange
    'linear-gradient(135deg, #3b82f6, #60a5fa)',  // blue
    'linear-gradient(135deg, #a855f7, #c084fc)',   // purple
    'linear-gradient(135deg, #14b8a6, #2dd4bf)',   // teal
    'linear-gradient(135deg, #ec4899, #f472b6)',   // pink
    'linear-gradient(135deg, #eab308, #facc15)',   // yellow
    'linear-gradient(135deg, #22c55e, #4ade80)',   // green
    'linear-gradient(135deg, #6366f1, #818cf8)',  // indigo
    'linear-gradient(135deg, #f43f5e, #fb7185)',   // rose
    'linear-gradient(135deg, #0ea5e9, #38bdf8)',  // sky
  ];
  function hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
  function getGroupGradient(id: string): string {
    return groupGradients[hashString(id) % groupGradients.length];
  }

  // Pull-to-refresh state
  let pullStartY = 0;
  let pullCurrentY = $state(0);
  let isPulling = false;
  let pullTriggered = false;
  let pullIndicatorVisible = $state(false);
  let isReloading = $state(false);

  function onTouchStart(e: TouchEvent) {
    if (!browser) return;
    const el = document.querySelector('.page-container');
    if (el && el.scrollTop <= 0) {
      pullStartY = e.touches[0].clientY;
      isPulling = true;
      pullTriggered = false;
    }
  }

  function onTouchMove(e: TouchEvent) {
    if (!isPulling || !browser) return;
    const el = document.querySelector('.page-container');
    if (el && el.scrollTop > 0) { isPulling = false; pullCurrentY = 0; return; }
    pullCurrentY = e.touches[0].clientY - pullStartY;
    if (pullCurrentY > 0) {
      pullIndicatorVisible = true;
      // Apply resistance
      const pullDistance = Math.min(pullCurrentY * 0.5, 80);
      (e.currentTarget as HTMLElement).style.transform = `translateY(${pullDistance}px)`;
      e.preventDefault();
    }
  }

  function onTouchEnd() {
    if (!browser) return;
    if (isPulling && pullCurrentY > 100 && !pullTriggered) {
      // Trigger reload
      pullTriggered = true;
      isReloading = true;
      window.location.reload();
    }
    // Reset
    isPulling = false;
    pullCurrentY = 0;
    setTimeout(() => { pullIndicatorVisible = false; isReloading = false; }, 300);
  }

  onMount(() => {
    const pageEl = document.querySelector('.page-container') as HTMLElement;
    if (!pageEl) return;
    pageEl.addEventListener('touchstart', onTouchStart, { passive: true });
    pageEl.addEventListener('touchmove', onTouchMove, { passive: false });
    pageEl.addEventListener('touchend', onTouchEnd);
    return () => {
      pageEl.removeEventListener('touchstart', onTouchStart);
      pageEl.removeEventListener('touchmove', onTouchMove);
      pageEl.removeEventListener('touchend', onTouchEnd);
    };
  });
</script>

<svelte:head>
  <title>Splitrr — {t('groups')}</title>
</svelte:head>

<div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
  <div class="section-header" style="margin-bottom: 0; border-bottom: none; padding-bottom: 0;">{t('groups')}</div>
  <a href="/groups/new" style="font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--gold); font-weight: 600;">+ {t('new_group')}</a>
</div>

<!-- Pull-to-refresh indicator -->
{#if pullIndicatorVisible}
  <div style="position: fixed; top: 0; left: 0; right: 0; z-index: 200; display: flex; align-items: center; justify-content: center; pointer-events: none; padding-top: max(env(safe-area-inset-top), 12px);">
    <div style="background: var(--bg2); border: 1px solid var(--glass-border); border-radius: 0 0 12px 12px; padding: 8px 16px; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.3);">
      {#if isReloading}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2" style="animation: spin 0.8s linear infinite;">
          <path d="M21 12a9 9 0 11-9-9" stroke-linecap="round"/>
        </svg>
      {:else}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2" style="transform: rotate({Math.min(pullCurrentY * 2, 180)}deg); transition: transform 0.1s ease;">
          <path d="M12 5v14M5 12l7-7 7 7" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      {/if}
      <span style="font-size: 11px; color: var(--gold); font-weight: 500;">
        {isReloading ? 'Loading...' : pullCurrentY > 100 ? 'Release to refresh' : 'Pull to refresh'}
      </span>
    </div>
  </div>
{/if}

{#if isLoading}
  <!-- Skeleton loaders -->
  {#each [1, 2, 3] as _, i}
    <div class="skeleton-group-card" style="animation-delay: {i * 50}ms;"></div>
  {/each}
{:else}
  {#each data.groups as group, i}
  <a href="/groups/{group.id}" style="text-decoration: none; display: block;">
    <div class="glass-card card-interactive card-enter card-enter-{Math.min(i, 9)}" style="display: flex; align-items: center; gap: 14px; padding: 14px 16px; margin-bottom: 12px; border-left: 3px solid transparent; padding-left: 14px;">
      <div style="
        width: 52px;
        height: 52px;
        border-radius: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        font-weight: 700;
        color: #fff;
        flex-shrink: 0;
        background: {getGroupGradient(group.id)};
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      ">{group.emoji || group.name?.[0] || '?'}</div>
      <div style="flex: 1; min-width: 0;">
        <div style="font-weight: 600; font-size: 15px; margin-bottom: 3px;">{group.name}</div>
        <div style="font-size: 11px; color: var(--text3); letter-spacing: 0.03em;">{t('members_count', { count: group.member_count, count2: group.expense_count })}</div>
      </div>
      <div style="text-align: right; flex-shrink: 0;">
        <div style="font-family: Georgia, 'Times New Roman', serif; font-weight: 700; font-size: 15px;" class:text-green={group.balance > 0} class:text-red={group.balance < 0} class:text-muted={group.balance === 0}>
          {group.balance > 0 ? '+' : ''}{fmt(group.balance)}
        </div>
        <div style="font-size: 9px; color: var(--text3); letter-spacing: 0.1em; text-transform: uppercase; margin-top: 2px;">
          {group.balance > 0 ? 'gets back' : group.balance < 0 ? 'owes' : 'settled'}
        </div>
      </div>
    </div>
  </a>
{/each}
{/if}

{#if !isLoading && data.groups.length === 0}
  <div style="text-align: center; padding: 20px 24px;">
    <EmptyState variant="no-groups" subtitle={emptyGroupsMessage(getLang() as 'en' | 'es')} />
    <a href="/groups/new" style="display: inline-block; margin-top: 8px;">
      <button class="btn-gold" style="padding: 12px 28px;">+ {t('create_one')}</button>
    </a>
  </div>
{/if}

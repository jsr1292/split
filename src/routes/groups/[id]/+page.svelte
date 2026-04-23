<script lang="ts">
  import { t, getSystemLocale, getLang } from '$lib/i18n/index.js';
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import AnimatedNumber from '$lib/components/AnimatedNumber.svelte';
  import DonutChart from '$lib/components/DonutChart.svelte';
  import { hapticStrong, haptic } from '$lib/haptic.js';
  import { triggerConfetti } from '$lib/confetti.js';
  import CategoryIcon from '$lib/components/CategoryIcon.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import { balanceHeroMessage, noExpensesMessage, oneExpenseMessage, allSettledMessage, settlingMessage } from '$lib/microcopy.js';
  let { data } = $props();

  // Skeleton loading state
  let isLoading = $state(true);
  $effect(() => {
    if (browser) {
      const timer = setTimeout(() => { isLoading = false; }, 300);
      return () => clearTimeout(timer);
    } else {
      isLoading = false;
    }
  });

  // Parallax header state
  let headerTranslateY = $state(0);
  let headerOpacity = $state(1);
  let headerScale = $state(1);
  let headerBalanceScale = $state(1);
  $effect(() => {
    if (!browser) return;
    let rafId: number;
    function onScroll() {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const scrollY = window.scrollY || document.documentElement.scrollTop;
        const maxScroll = 120;
        headerTranslateY = Math.min(scrollY * 0.3, maxScroll * 0.3);
        headerOpacity = Math.max(1 - (scrollY / maxScroll) * 0.3, 0.7);
        headerScale = Math.max(1 - (scrollY / maxScroll) * 0.08, 0.92);
        headerBalanceScale = Math.max(1 - (scrollY / maxScroll) * 0.12, 0.88);
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(rafId);
    };
  });

  function fmt(n: number, curr?: string) {
    const currency = curr || data.group?.currency || 'EUR';
    return new Intl.NumberFormat(getSystemLocale(), { style: 'currency', currency }).format(n);
  }

  function fmtUser(n: number) {
    return new Intl.NumberFormat(getSystemLocale(), { style: 'currency', currency: data.userBaseCurrency || 'EUR' }).format(n);
  }

  function balanceLabel(n: number) {
    if (n > 0) return `+${fmtUser(n)}`;
    if (n < 0) return `−${fmtUser(Math.abs(n))}`;
    return fmtUser(0);
  }

  // Deterministic gradient for group avatars based on group ID
  const groupGradients = [
    'linear-gradient(135deg, #f97316, #fb923c)',
    'linear-gradient(135deg, #3b82f6, #60a5fa)',
    'linear-gradient(135deg, #a855f7, #c084fc)',
    'linear-gradient(135deg, #14b8a6, #2dd4bf)',
    'linear-gradient(135deg, #ec4899, #f472b6)',
    'linear-gradient(135deg, #eab308, #facc15)',
    'linear-gradient(135deg, #22c55e, #4ade80)',
    'linear-gradient(135deg, #6366f1, #818cf8)',
    'linear-gradient(135deg, #f43f5e, #fb7185)',
    'linear-gradient(135deg, #0ea5e9, #38bdf8)',
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

  // Settle up state
  let showSettle = $state(false);
  let settling = $state(false);
  let sheetTranslateY = $state(0);

  // Long-press expense context menu
  let longPressTimer: ReturnType<typeof setTimeout> | null = null;
  let longPressTarget = $state<string | null>(null);
  let touchStartX = 0;
  let touchStartY = 0;
  let showExpenseMenu = $state(false);
  let menuExpense = $state<any>(null);
  let menuX = $state(0);
  let menuY = $state(0);

  function onExpenseTouchStart(e: TouchEvent, exp: any) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    longPressTarget = exp.id;
    longPressTimer = setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(10);
      menuExpense = exp;
      // Position near touch point but keep on screen
      menuX = Math.min(e.touches[0].clientX, window.innerWidth - 160);
      menuY = Math.min(e.touches[0].clientY, window.innerHeight - 200);
      showExpenseMenu = true;
      longPressTarget = null;
    }, 500);
  }

  function onExpenseTouchMove(e: TouchEvent) {
    const dx = Math.abs(e.touches[0].clientX - touchStartX);
    const dy = Math.abs(e.touches[0].clientY - touchStartY);
    if (dx > 10 || dy > 10) {
      // Cancelled - finger moved
      if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
      longPressTarget = null;
    }
  }

  function onExpenseTouchEnd() {
    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
    longPressTarget = null;
  }

  function closeExpenseMenu() {
    showExpenseMenu = false;
    menuExpense = null;
  }

  function editExpense(exp: any) {
    closeExpenseMenu();
    window.location.href = `/expense/${exp.id}`;
  }

  async function deleteExpense(exp: any) {
    closeExpenseMenu();
    if (await (window as any).showConfirm(t('confirm_delete_expense') || 'Delete this expense?')) {
      await fetch(`/api/expenses/${exp.id}`, { method: 'DELETE' });
      window.location.reload();
    }
  }

  function shareExpense(exp: any) {
    closeExpenseMenu();
    const text = `${exp.description}: ${fmt(exp.amount, exp.currency || 'EUR')} (${t('paid_by')} ${exp.paid_by_name})`;
    if (navigator.share) {
      navigator.share({ title: exp.description, text });
    } else {
      navigator.clipboard.writeText(text);
      (window as any).showOfflineToast?.(t('copied') || 'Copied!');
    }
  }
  let sheetStartY = 0;
  let sheetTouchStartY = 0;
  let showInvite = $state(false);
  let inviteLinkCopied = $state(false);

  function onSheetTouchStart(e: TouchEvent) {
    sheetStartY = sheetTranslateY;
    sheetTouchStartY = e.touches[0].clientY;
  }
  function onSheetTouchMove(e: TouchEvent) {
    const dy = e.touches[0].clientY - sheetTouchStartY;
    if (dy > 0) {
      sheetTranslateY = sheetStartY + dy;
      e.stopPropagation();
    }
  }
  function onSheetTouchEnd() {
    if (sheetTranslateY > 80) {
      showSettle = false;
    }
    sheetTranslateY = 0;
  }
  $effect(() => { if (!showSettle) sheetTranslateY = 0; });

  function copyInviteLink() {
    const link = window.location.origin + '/groups/' + data.group.id + '/join';
    navigator.clipboard.writeText(link).then(() => {
      inviteLinkCopied = true;
      setTimeout(() => inviteLinkCopied = false, 2000);
    }).catch(() => {
      // Fallback: select a temporary input
      const input = document.createElement('input');
      input.value = link;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      inviteLinkCopied = true;
      setTimeout(() => inviteLinkCopied = false, 2000);
    });
  }

  // Simplify balances into minimum transactions (greedy algorithm)
  function simplifyBalances(balances: any[]) {
    const net: Record<string, { name: string; amount: number }> = {};
    for (const b of balances) {
      if (!net[b.from_user]) net[b.from_user] = { name: b.from_name, amount: 0 };
      if (!net[b.to_user]) net[b.to_user] = { name: b.to_name, amount: 0 };
      net[b.from_user].amount -= b.amount;
      net[b.to_user].amount += b.amount;
    }

    const debtors = Object.entries(net)
      .filter(([_, v]) => v.amount < -0.01)
      .map(([id, v]) => ({ id, name: v.name, amount: -v.amount }))
      .sort((a, b) => b.amount - a.amount);

    const creditors = Object.entries(net)
      .filter(([_, v]) => v.amount > 0.01)
      .map(([id, v]) => ({ id, name: v.name, amount: v.amount }))
      .sort((a, b) => b.amount - a.amount);

    const transactions: { from: string; fromName: string; to: string; toName: string; amount: number }[] = [];

    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      const amount = Math.min(debtors[i].amount, creditors[j].amount);
      if (amount > 0.01) {
        transactions.push({
          from: debtors[i].id, fromName: debtors[i].name,
          to: creditors[j].id, toName: creditors[j].name,
          amount: Math.round(amount * 100) / 100
        });
      }
      debtors[i].amount -= amount;
      creditors[j].amount -= amount;
      if (debtors[i].amount < 0.01) i++;
      if (creditors[j].amount < 0.01) j++;
    }

    return transactions;
  }

  let suggestedSettlements = $state(data.group ? simplifyBalances(data.balances) : []);
  let editedAmounts = $state<Record<number, string>>({});
  let selectedSettlements = $state<Set<number>>(new Set());

  $effect(() => {
    // Select all by default when settlements change
    const s = new Set<number>();
    suggestedSettlements.forEach((_, i) => s.add(i));
    selectedSettlements = s;
  });

  function getEditedAmount(i: number, original: number) {
    const edited = editedAmounts[i];
    if (edited !== undefined) {
      const parsed = parseFloat(edited.replace(',', '.'));
      return isNaN(parsed) ? original : parsed;
    }
    return original;
  }
  let totalToSettle = $derived(suggestedSettlements.reduce((sum, s, i) => selectedSettlements.has(i) ? sum + getEditedAmount(i, s.amount) : sum, 0));
  let totalCatAmount = $derived(data.categories.reduce((s: number, c: any) => s + c.total, 0));
  
  // Donut chart data (only if more than 1 category)
  let donutData = $derived(() => {
    if (data.categories.length <= 1) return [];
    return data.categories.map(c => ({
      category: c.category,
      value: c.total
    }));
  });

  // Balance ring: settlement progress
  let totalDebt = $derived(data.balances.reduce((s: number, b: any) => s + b.amount, 0));
  let totalSettled = $derived(data.settlements.reduce((s: number, st: any) => s + st.amount, 0));
  let settledPercent = $derived(
    totalDebt + totalSettled <= 0 ? 0 : Math.min(100, Math.round((totalSettled / (totalDebt + totalSettled)) * 100))
  );
  let showBalanceRing = $derived(totalDebt > 0 && totalSettled < totalDebt + totalSettled);

  async function confirmSettle() {
    settling = true;
    hapticStrong(); // Strong haptic when settling debts
    const today = new Date().toISOString().split('T')[0];
    try {
      for (const [i, s] of suggestedSettlements.entries()) {
        if (!selectedSettlements.has(i)) continue;
        const amount = getEditedAmount(i, s.amount);
        if (amount > 0.001) {
          await fetch('/api/settle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              groupId: data.group.id,
              fromUser: s.from,
              toUser: s.to,
              amount,
              date: today
            })
          });
        }
      }
      triggerConfetti();
      hapticStrong();
      await new Promise(r => setTimeout(r, 600));
      window.location.reload();
    } catch {
      alert(t('error'));
    } finally {
      settling = false;
    }
  }

  // Pull-to-refresh state
  let pullStartY = 0;
  let pullCurrentY = $state(0);
  let isPulling = false;
  let pullTriggered = false;
  let pullIndicatorVisible = $state(false);
  let isReloading = $state(false);

  function onPullTouchStart(e: TouchEvent) {
    if (!browser) return;
    const el = document.querySelector('.page-container') as HTMLElement;
    if (el && el.scrollTop <= 0) {
      pullStartY = e.touches[0].clientY;
      isPulling = true;
      pullTriggered = false;
    }
  }

  function onPullTouchMove(e: TouchEvent) {
    if (!isPulling || !browser) return;
    const el = document.querySelector('.page-container') as HTMLElement;
    if (el && el.scrollTop > 0) { isPulling = false; pullCurrentY = 0; return; }
    pullCurrentY = e.touches[0].clientY - pullStartY;
    if (pullCurrentY > 0) {
      pullIndicatorVisible = true;
      const pullDistance = Math.min(pullCurrentY * 0.5, 80);
      const pageEl = document.querySelector('.page-container') as HTMLElement;
      if (pageEl) pageEl.style.transform = `translateY(${pullDistance}px)`;
      e.preventDefault();
    }
  }

  function onPullTouchEnd() {
    if (!browser) return;
    const pageEl = document.querySelector('.page-container') as HTMLElement;
    if (pageEl) pageEl.style.transform = '';
    if (isPulling && pullCurrentY > 100 && !pullTriggered) {
      pullTriggered = true;
      isReloading = true;
      window.location.reload();
    }
    isPulling = false;
    pullCurrentY = 0;
    setTimeout(() => { pullIndicatorVisible = false; isReloading = false; }, 300);
  }

  // Tab swipe navigation
  const tabs = ['expenses', 'balances', 'members'];
  let activeTab = $state('expenses');
  let tabStartX = 0;
  let tabStartY = 0;
  let tabActive = false;
  let tabAnimating = false;
  let tabAnimDir = $state<'left' | 'right' | null>(null);

  function onTabTouchStart(e: TouchEvent) {
    if (!browser || tabAnimating) return;
    tabStartX = e.touches[0].clientX;
    tabStartY = e.touches[0].clientY;
    tabActive = true;
  }

  function onTabTouchEnd(e: TouchEvent) {
    if (!tabActive || !browser || tabAnimating) return;
    tabActive = false;
    const dx = e.changedTouches[0].clientX - tabStartX;
    const dy = Math.abs(e.changedTouches[0].clientY - tabStartY);
    // Only swipe if horizontal and significant
    if (Math.abs(dx) > 50 && Math.abs(dy) < Math.abs(dx) * 0.6) {
      const idx = tabs.indexOf(activeTab);
      if (dx < 0 && idx < tabs.length - 1) {
        // Swipe left = next tab
        tabAnimDir = 'left';
        tabAnimating = true;
        hapticLight();
        setTimeout(() => {
          activeTab = tabs[idx + 1];
          tabAnimating = false;
          tabAnimDir = null;
        }, 300);
      } else if (dx > 0 && idx > 0) {
        // Swipe right = prev tab
        tabAnimDir = 'right';
        tabAnimating = true;
        hapticLight();
        setTimeout(() => {
          activeTab = tabs[idx - 1];
          tabAnimating = false;
          tabAnimDir = null;
        }, 300);
      }
    }
  }

  onMount(() => {
    // Pull-to-refresh on page container
    const pageEl = document.querySelector('.page-container') as HTMLElement;
    if (pageEl) {
      pageEl.addEventListener('touchstart', onPullTouchStart, { passive: true });
      pageEl.addEventListener('touchmove', onPullTouchMove, { passive: false });
      pageEl.addEventListener('touchend', onPullTouchEnd);
    }
    // Tab swipe on tab content
    const tabContent = document.querySelector('.tab-swipe-track') as HTMLElement;
    if (tabContent) {
      tabContent.addEventListener('touchstart', onTabTouchStart, { passive: true });
      tabContent.addEventListener('touchend', onTabTouchEnd);
    }
    return () => {
      pageEl?.removeEventListener('touchstart', onPullTouchStart);
      pageEl?.removeEventListener('touchmove', onPullTouchMove);
      pageEl?.removeEventListener('touchend', onPullTouchEnd);
      tabContent?.removeEventListener('touchstart', onTabTouchStart);
      tabContent?.removeEventListener('touchend', onTabTouchEnd);
    };
  });

  // Activity timeline: group expenses by date
  interface TimelineItem {
    date: string;
    label: string;
    expenses: typeof data.expenses;
  }

  function getDateLabel(dateStr: string): string {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString(getSystemLocale(), { day: 'numeric', month: 'short' });
  }

  function groupExpensesByDate(expenses: typeof data.expenses): TimelineItem[] {
    const groups: Record<string, typeof data.expenses> = {};
    for (const exp of expenses) {
      const dateKey = exp.date.split('T')[0];
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(exp);
    }
    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, exps]) => ({
        date,
        label: getDateLabel(date),
        expenses: exps
      }));
  }

  let timelineGroups = $derived(groupExpensesByDate(data.expenses));

  function hapticLight() {
    if (browser && navigator.vibrate) navigator.vibrate(5);
  }
</script>

<svelte:head>
  <title>Splitrr — {data.group?.name || t('groups')}</title>
</svelte:head>

{#if data.group}
  {@const g = data.group}

  <!-- Back link -->
  <div style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
    <a href="/" style="font-size: 12px; color: var(--text3); letter-spacing: 0.05em; display: inline-flex; align-items: center; gap: 4px;">
      ← {t('groups')}
    </a>
    <div style="display: flex; gap: 10px; align-items: center;">
      <button onclick={() => showInvite = true} style="background: none; border: none; color: var(--gold); font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; cursor: pointer;">🔗 {t('invite')}</button>
      <a href="/groups/{g.id}/edit" style="font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--gold);">✏️</a>
    </div>
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
    <!-- Skeleton loader for header -->
    <div class="skeleton-header"></div>
    <!-- Skeleton for suggested payer -->
    <div class="skeleton" style="height: 60px; border-radius: 14px; margin-bottom: 16px;"></div>
    <!-- Skeleton for categories -->
    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 20px;">
      {#each [1,2,3,4] as _}
        <div class="skeleton-category-chip"></div>
      {/each}
    </div>
    <!-- Skeleton for members -->
    <div class="section-header">Members</div>
    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 20px;">
      {#each [1,2,3,4] as _}
        <div class="skeleton-member"></div>
      {/each}
    </div>
    <!-- Skeleton for expenses -->
    <div class="section-header">Expenses</div>
    {#each [1,2,3] as _}
      <div class="skeleton-expense-item"></div>
    {/each}
  {:else}

  <!-- Group Header -->
  <div style="
    text-align: center;
    padding: 24px 20px 20px;
    margin-bottom: 16px;
    border-radius: 20px;
    background: linear-gradient(135deg, rgba(201,168,76,0.08) 0%, var(--glass) 50%, rgba(0,229,160,0.04) 100%);
    border: 1px solid rgba(201,168,76,0.12);
    transform: translateY({headerTranslateY}px) scale({headerScale});
    opacity: {headerOpacity};
    transition: transform 0.05s linear, opacity 0.05s linear;
    will-change: transform, opacity;
    box-shadow: 0 4px 24px rgba(0,0,0,0.2);
    transform-origin: top center;
  ">
    <div style="
      width: 72px;
      height: 72px;
      border-radius: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 40px;
      margin: 0 auto 12px;
      background: rgba(201,168,76,0.12);
      border: 1px solid rgba(201,168,76,0.2);
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
    "
    class="emoji-icon">{g.emoji}</div>
    <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 4px;">
      <div style="width: 10px; height: 10px; border-radius: 3px; background: {getGroupGradient(g.id)}; flex-shrink: 0; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>
      <div style="font-family: Georgia, 'Times New Roman', serif; font-size: {Math.round(22 * headerScale)}px; font-weight: 700; color: var(--gold); letter-spacing: -0.01em; transition: font-size 0.05s linear;">{g.name}</div>
    </div>
    <div style="font-size: 11px; color: var(--text3); letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 4px;">{t('members_count', { count: data.members.length, count2: data.expenses.length })}</div>
    <div style="font-size: 9px; color: var(--text3); letter-spacing: 0.08em; margin-bottom: 16px;">{t('currency')}: {g.currency || 'EUR'}{g.currency_mode === 'fx_lock' ? ' · Fair FX' : ''}</div>
    <div class="gold-divider"></div>
    <div style="margin-top: 16px; display: flex; align-items: center; justify-content: center; gap: 20px;">
      <div style="text-align: center;">
        <div class="stat-label">{t('your_balance')}</div>
        <div style="font-family: Georgia, 'Times New Roman', serif; font-size: {Math.round(32 * headerBalanceScale)}px; font-weight: 700; line-height: 1.1; margin-top: 6px; transition: font-size 0.05s linear;" class:text-green={data.myBalance > 0} class:text-red={data.myBalance < 0} class:text-muted={data.myBalance === 0}>
          <AnimatedNumber value={data.myBalance} format={balanceLabel} />
        </div>
        {#if (g.currency || 'EUR') !== data.userBaseCurrency}
          <div style="font-size: 12px; color: var(--text3); margin-top: 4px;">(≈ {fmt(data.myBalance, g.currency || 'EUR')})</div>
        {/if}
        <div style="font-size: 11px; color: var(--text3); margin-top: 6px; font-style: italic;">
          {balanceHeroMessage(getLang() as 'en' | 'es', data.myBalance, data.balances.filter((b: any) => b.to_user === data.self?.id).length)}
        </div>
      </div>
      {#if showBalanceRing}
        <div class="balance-ring" style="position: relative; width: 72px; height: 72px; flex-shrink: 0;">
          <svg width="72" height="72" viewBox="0 0 72 72" style="transform: rotate(-90deg);">
            <!-- Background ring -->
            <circle cx="36" cy="36" r="28" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="6"/>
            <!-- Settled ring -->
            <circle
              cx="36" cy="36" r="28"
              fill="none"
              stroke="var(--green)"
              stroke-width="6"
              stroke-linecap="round"
              stroke-dasharray="{2 * Math.PI * 28}"
              stroke-dashoffset="{2 * Math.PI * 28 * (1 - settledPercent / 100)}"
              style="transition: stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1);"
            />
          </svg>
          <div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; transform: rotate(0deg);">
            <div style="font-size: 13px; font-weight: 700; color: var(--green); line-height: 1;">{settledPercent}%</div>
            <div style="font-size: 8px; color: var(--text3); letter-spacing: 0.05em; margin-top: 1px;">settled</div>
          </div>
        </div>
      {/if}
    </div>
  </div>

  <!-- Who Should Pay Next -->
  {#if data.suggestedPayer}
    <div style="
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      margin-bottom: 16px;
      border-radius: 14px;
      background: linear-gradient(135deg, rgba(201,168,76,0.06) 0%, var(--panel) 100%);
      border: 1px solid rgba(201,168,76,0.15);
    ">
      <span class="emoji-icon" style="font-size: 20px;">💡</span>
      <div style="flex: 1;">
        <div style="font-size: 10px; color: var(--text3); letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 2px;">{t('next_payment')}</div>
        <div style="font-size: 13px; font-weight: 600; color: var(--text2);">
          <span style="width: 24px; height: 24px; border-radius: 50%; background: {data.suggestedPayer.avatar_color}; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: var(--avatar-text); margin-right: 6px;">{data.suggestedPayer.name[0]}</span>
          {t('should_pay_next', { name: data.suggestedPayer.name })}
        </div>
      </div>
    </div>
  {/if}

  <!-- Category Breakdown -->
  {#if data.categories.length > 1 && !isLoading}
    <!-- Donut Chart (only show if more than 1 category) -->
    <div style="margin-bottom: 20px;">
      <DonutChart data={donutData()} size={140} strokeWidth={14} />
    </div>
  {/if}

  {#if data.categories.length > 0}
    <div style="margin-bottom: 20px;">
      <div class="section-header">{t('by_category')}</div>
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(70px, 1fr)); gap: 8px; margin-bottom: 16px;">
        {#each data.categories as cat}
          <div style="
            text-align: center;
            padding: 12px 6px;
            border-radius: 12px;
            background: linear-gradient(135deg, var(--panel) 0%, var(--glass) 100%);
            border: 1px solid rgba(255,255,255,0.05);
          ">
            <div style="display: flex; justify-content: center; margin-bottom: 4px;"><CategoryIcon category={cat.category} size={20} /></div>
            <div style="font-family: Georgia, 'Times New Roman', serif; font-size: 13px; font-weight: 700; color: var(--gold);">{fmt(cat.total)}</div>
            <div style="font-size: 9px; color: var(--text3); margin-top: 2px;">{cat.count}×</div>
          </div>
        {/each}
      </div>
      <!-- Horizontal Bar Chart -->
      <div style="display: flex; flex-direction: column; gap: 8px;">
        {#each data.categories as cat}
          <div style="display: flex; align-items: center; gap: 10px;">
            <CategoryIcon category={cat.category} size={16} />
            <div style="flex: 1; height: 6px; background: rgba(255,255,255,0.04); border-radius: 3px; overflow: hidden;">
              <div style="height: 100%; width: {Math.round((cat.total / totalCatAmount) * 100)}%; background: linear-gradient(90deg, var(--gold), rgba(201,168,76,0.5)); border-radius: 3px; transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);"></div>
            </div>
            <div style="font-family: Georgia, 'Times New Roman', serif; font-size: 12px; font-weight: 700; color: var(--gold); min-width: 36px; text-align: right;">{Math.round((cat.total / totalCatAmount) * 100)}%</div>
          </div>
        {/each}
      </div>
    </div>
  {/if}


  <!-- Settle Up Panel -->
  {#if showSettle && suggestedSettlements.length > 0}
    <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 200; display: flex; align-items: flex-end; justify-content: center;" onclick={() => showSettle = false}>
      <div style="background: var(--bg2); border-top: 1px solid var(--glass-border); border-radius: 16px 16px 0 0; width: 100%; max-width: 500px; max-height: 70vh; overflow-y: auto; padding: 20px; padding-top: 12px; padding-bottom: calc(20px + max(env(safe-area-inset-bottom), 8px)); transform: translateY({sheetTranslateY}px); transition: transform 0.1s linear;" onclick={(e) => e.stopPropagation()} ontouchstart={onSheetTouchStart} ontouchmove={onSheetTouchMove} ontouchend={onSheetTouchEnd}>
        <!-- Drag handle -->
        <div style="width: 36px; height: 6px; background: var(--glass-border); border-radius: 3px; margin: 0 auto 8px;"></div>
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
          <div style="font-family: 'Libre Baskerville', Georgia, serif; font-size: 16px; font-weight: 700; color: var(--gold);">{t('settle_debts')}</div>
          <button onclick={() => showSettle = false} style="background: none; border: none; color: var(--text3); font-size: 18px; cursor: pointer;">✕</button>
        </div>
        <div style="font-size: 11px; color: var(--text3); margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
          <span>{t('minimum_transactions')}</span>
          <button onclick={() => { if (selectedSettlements.size === suggestedSettlements.length) { selectedSettlements = new Set(); } else { const ns = new Set<number>(); suggestedSettlements.forEach((_, i) => ns.add(i)); selectedSettlements = ns; } }} style="background: none; border: none; color: var(--gold); font-size: 11px; cursor: pointer; text-decoration: underline;">{selectedSettlements.size === suggestedSettlements.length ? 'Deselect all' : 'Select all'}</button>
        </div>

        {#each suggestedSettlements as s, i}
          <div class="glass-card-static" style="display: flex; align-items: center; gap: 8px; padding: 10px 12px; opacity: {selectedSettlements.has(i) ? '1' : '0.5'};">
            <input type="checkbox" checked={selectedSettlements.has(i)} onchange={() => { const ns = new Set(selectedSettlements); if (ns.has(i)) ns.delete(i); else ns.add(i); selectedSettlements = ns; }} style="accent-color: #72D2A2; width: 18px; height: 18px; flex-shrink: 0;" />
            <div class="emoji-icon" style="font-size: 16px; width: 24px; text-align: center; flex-shrink: 0;">💸</div>
            <div style="flex: 1; min-width: 0;">
              <div style="font-size: 11px;">
                <span style="font-weight: 600;" class:text-red={s.from === data.self?.id}>{s.fromName}</span>
                <span style="color: var(--text3);"> → </span>
                <span style="font-weight: 600;" class:text-green={s.to === data.self?.id}>{s.toName}</span>
              </div>
              <div style="font-size: 11px; color: var(--text3);">{t('max')}: {fmt(s.amount)}</div>
            </div>
            <div style="display: flex; align-items: center; gap: 4px;">
              <span style="color: var(--gold); font-size: 12px;">€</span>
              <input
                type="text"
                inputmode="decimal"
                value={editedAmounts[i] !== undefined ? editedAmounts[i] : s.amount.toFixed(2)}
                oninput={(e) => { const v = (e.target as HTMLInputElement).value; if (/^[\d.,]*$/.test(v)) editedAmounts[i] = v; }}
                style="width: 64px; background: var(--bg); border: 1px solid var(--glass-border); border-radius: 6px; color: var(--gold); font-family: 'Libre Baskerville', Georgia, serif; font-size: 13px; font-weight: 700; padding: 4px 6px; text-align: right;"
              />
            </div>
          </div>
        {/each}

        <div style="margin-top: 12px; padding: 10px 12px; background: rgba(201,168,76,0.08); border: 1px solid rgba(201,168,76,0.2); border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
          <div style="font-size: 11px; color: var(--text3);">{t('total_to_settle')}</div>
          <div style="font-family: 'Libre Baskerville', Georgia, serif; font-size: 16px; font-weight: 700; color: var(--gold);">{fmt(totalToSettle)}</div>
        </div>
        <div style="text-align: center; margin-top: 12px;">
          <button class="btn-gold" style="width: 100%; padding: 12px;" onclick={confirmSettle} disabled={settling}>
            {settling ? settlingMessage(getLang() as 'en' | 'es') : t('settle') + ' ' + fmt(totalToSettle)}
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Invite Modal -->
  {#if showInvite}
    <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 200; display: flex; align-items: flex-end; justify-content: center;" onclick={() => showInvite = false}>
      <div style="background: var(--bg2); border-top: 1px solid var(--glass-border); border-radius: 16px 16px 0 0; width: 100%; max-width: 500px; padding: 20px;" onclick={(e) => e.stopPropagation()}>
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
          <div style="font-family: 'Libre Baskerville', Georgia, serif; font-size: 16px; font-weight: 700; color: var(--gold);">{t('invite_to_group')}</div>
          <button onclick={() => showInvite = false} style="background: none; border: none; color: var(--text3); font-size: 18px; cursor: pointer;">✕</button>
        </div>
        <div style="font-size: 12px; color: var(--text3); margin-bottom: 12px;">
          {t('share_link', { group: g.name })}
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <input
            type="text"
            readonly
            value={typeof window !== 'undefined' ? window.location.origin + '/groups/' + g.id + '/join' : '/groups/' + g.id + '/join'}
            style="flex: 1; background: var(--bg); border: 1px solid var(--glass-border); border-radius: 8px; color: var(--text2); font-size: 12px; padding: 10px 12px; font-family: 'JetBrains Mono', monospace;"
          />
          <button onclick={copyInviteLink} style="background: var(--gold); border: none; border-radius: 8px; color: var(--btn-gold-text); font-size: 11px; font-weight: 700; padding: 10px 14px; cursor: pointer; white-space: nowrap;">
            {inviteLinkCopied ? t('copied') : t('copy')}
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Tabs -->
  <div style="display: flex; gap: 4px; margin-bottom: 16px; background: rgba(255,255,255,0.03); border-radius: 12px; padding: 4px;">
    {#each tabs as tab}
      <button
        onclick={() => { activeTab = tab; hapticLight(); }}
        style="
          flex: 1;
          padding: 10px 12px;
          border-radius: 8px;
          border: none;
          background: {activeTab === tab ? 'linear-gradient(135deg, var(--gold2), var(--gold))' : 'transparent'};
          color: {activeTab === tab ? 'var(--btn-gold-text)' : 'var(--text3)'};
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.05em;
          cursor: pointer;
          transition: all 0.2s ease;
          text-transform: uppercase;
        "
      >
        {tab === 'expenses' ? t('expenses') : tab === 'balances' ? t('pending_balances') : t('group_members')}
      </button>
    {/each}
  </div>

  <!-- Tab Content with Swipe -->
  <div class="tab-swipe-container" ontouchstart={onTabTouchStart} ontouchend={onTabTouchEnd}>
    <div
      class="tab-swipe-track"
      style="transform: translateX({-tabs.indexOf(activeTab) * 100}%); transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);"
    >
      <!-- Expenses Tab -->
      <div class="tab-swipe-content">
        <!-- Add Expense Header -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
          <div class="section-header" style="margin-bottom: 0; border-bottom: none; padding-bottom: 0;">{t('expenses')}</div>
          <div style="display: flex; gap: 12px; align-items: center;">
            <a href="/api/groups/{g.id}/export" style="color: var(--text3); display: flex; align-items: center;" title={t('export')}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </a>
            <a href="/expense/new?group={g.id}" style="font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--gold); font-weight: 600;">+ {t('add')}</a>
          </div>
        </div>

        <!-- Activity Timeline for Expenses -->
        {#if timelineGroups.length > 0}
          <div class="timeline">
            {#each timelineGroups as group, gi}
              <!-- Date Separator -->
              <div class="timeline-date-separator">
                <span class="timeline-date-label">{group.label}</span>
              </div>
              <!-- Expenses for this date -->
              {#each group.expenses as exp, i}
                <div class="timeline-item"
                  ontouchstart={(e) => onExpenseTouchStart(e, exp)}
                  ontouchmove={onExpenseTouchMove}
                  ontouchend={onExpenseTouchEnd}
                >
                  <div class="timeline-dot"></div>
                  <div class="timeline-card">
                      <div class="glass-card card-interactive" style="display: flex; align-items: center; gap: 14px; padding: 14px 16px; margin-bottom: 10px;">
                        <div style="
                          width: 44px;
                          height: 44px;
                          border-radius: 12px;
                          display: flex;
                          align-items: center;
                          justify-content: center;
                          flex-shrink: 0;
                          background: rgba(255,255,255,0.04);
                          border: 1px solid rgba(255,255,255,0.06);
                        ">
                          <CategoryIcon category={exp.category} size={22} />
                        </div>
                        <div style="flex: 1; min-width: 0;">
                          <div style="font-weight: 500; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-bottom: 3px;">
                            {exp.description}
                            {#if exp.recurring}
                              <span title="{exp.recurring === 'weekly' ? t('weekly') : exp.recurring === 'monthly' ? t('monthly') : t('yearly')}" style="margin-left: 4px; font-size: 11px;">🔄</span>
                            {/if}
                          </div>
                          <div style="font-size: 11px; color: var(--text3); letter-spacing: 0.02em;">
                            {new Date(exp.date).toLocaleDateString(getSystemLocale(), { day: 'numeric', month: 'short' })} · {t('paid_by')} {exp.paid_by_name}
                            {#if exp.recurring_parent_id}<span style="color: var(--gold-dim);"> ·{t('instance')}</span>{/if}
                          </div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
                          <div style="font-family: Georgia, 'Times New Roman', serif; font-weight: 700; font-size: 15px;">{fmt(exp.amount, exp.currency || 'EUR')}</div>
                          <div class="expense-menu-hint" style="font-size: 14px; color: var(--text3); line-height: 1; cursor: pointer;" aria-label="More options">•••</div>
                        </div>
                      </div>
                  </div>
                </div>
              {/each}
            {/each}
          </div>
        {:else}
          <EmptyState variant="no-expenses" subtitle={data.expenses.length === 0 ? noExpensesMessage(getLang() as 'en' | 'es') : oneExpenseMessage(getLang() as 'en' | 'es')} />
        {/if}
      </div>

      <!-- Balances Tab -->
      <div class="tab-swipe-content">
        {#if data.balances.length > 0}
          <div class="section-header">{t('pending_balances')}</div>
          {#each data.balances as b, i}
            <div class="glass-card card-enter card-enter-{Math.min(i, 9)}" style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; margin-bottom: 8px;">
              <div style="flex: 1; min-width: 0;">
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
                  <span style="width: 22px; height: 22px; border-radius: 50%; background: rgba(255,77,106,0.2); display: inline-flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: var(--red);" class:text-red={b.from_user === data.self?.id}>{b.from_name[0]}</span>
                  <span style="color: var(--text3); font-size: 11px;">→</span>
                  <span style="width: 22px; height: 22px; border-radius: 50%; background: rgba(0,229,160,0.2); display: inline-flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: var(--green);" class:text-green={b.to_user === data.self?.id}>{b.to_name[0]}</span>
                  <span style="font-size: 12px; font-weight: 600;">
                    <span class:text-red={b.from_user === data.self?.id}>{b.from_name}</span>
                    <span style="color: var(--text3); font-size: 11px;"> owes </span>
                    <span class:text-green={b.to_user === data.self?.id}>{b.to_name}</span>
                  </span>
                </div>
                {#if (b.currency || 'EUR') !== 'EUR'}
                  <div style="font-size: 9px; color: var(--text3); margin-left: 28px;">{b.currency || 'EUR'}</div>
                {/if}
              </div>
              <div style="font-family: Georgia, 'Times New Roman', serif; font-weight: 700; font-size: 15px;" class:text-green={b.to_user === data.self?.id} class:text-red={b.from_user === data.self?.id}>
                {fmt(b.amount, b.currency || 'EUR')}
              </div>
            </div>
          {/each}
          <div style="text-align: center; margin-top: 14px;">
            <button class="btn-gold" onclick={() => showSettle = true}>{t('settle_debts')}</button>
          </div>
        {:else}
          <EmptyState variant="all-settled" subtitle={allSettledMessage(getLang() as 'en' | 'es')} />
        {/if}
      </div>

      <!-- Members Tab -->
      <div class="tab-swipe-content">
        <div class="section-header">{t('group_members')}</div>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 10px;">
          {#each data.members as member, i}
            <div style="
              display: flex;
              align-items: center;
              gap: 10px;
              padding: 12px 14px;
              border-radius: 14px;
              background: linear-gradient(135deg, var(--panel) 0%, var(--glass) 100%);
              border: 1px solid rgba(255,255,255,0.05);
            "
            class="card-enter card-enter-{Math.min(i, 9)}"
          >
            <div class="avatar" style="background: {member.avatar_color}; width: 38px; height: 38px; font-size: 15px;">{member.name[0]}</div>
            <div style="min-width: 0;">
              <div style="font-size: 13px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{member.name}</div>
              {#if member.is_self}
                <div style="font-size: 10px; color: var(--gold); letter-spacing: 0.05em;">{t('you')}</div>
              {/if}
            </div>
          </div>
          {/each}
        </div>
      </div>
    </div>
  </div>

  <!-- Add Expense Button -->
  <div style="text-align: center; margin-top: 16px; margin-bottom: 40px;">
    <a href="/expense/new?group={g.id}">
      <button class="btn-gold" style="padding: 12px 32px;">+ {t('add_expense')}</button>
    </a>
  </div>

  <!-- Settlements -->
  {#if data.settlements.length > 0}
    <div style="margin-top: 20px; margin-bottom: 40px;">
      <div class="section-header">{t('settlements')}</div>
      {#each data.settlements as s}
        <div class="glass-card" style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; margin-bottom: 8px;">
          <div style="
            width: 38px;
            height: 38px;
            border-radius: 50%;
            background: rgba(0,229,160,0.15);
            border: 1px solid rgba(0,229,160,0.2);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            flex-shrink: 0;
          ">💸</div>
          <div style="flex: 1;">
            <div style="font-size: 13px; font-weight: 600; margin-bottom: 2px;"><span style="color: var(--red);">{s.from_name}</span> → <span style="color: var(--green);">{s.to_name}</span></div>
            <div style="font-size: 11px; color: var(--text3);">{new Date(s.date).toLocaleDateString(getSystemLocale(), { day: 'numeric', month: 'short', year: 'numeric' })}</div>
          </div>
          <div style="font-family: Georgia, 'Times New Roman', serif; font-weight: 700; font-size: 15px; color: var(--green); flex-shrink: 0;">{fmt(s.amount)}</div>
          <button onclick={async () => { if (await (window as any).showConfirm(t('confirm_undo'))) { await fetch(`/api/settlements/${s.id}`, { method: 'DELETE' }); window.location.reload(); } }} style="background: rgba(255,77,106,0.1); border: 1px solid rgba(255,77,106,0.2); border-radius: 8px; color: var(--red); font-size: 12px; cursor: pointer; padding: 4px 8px; flex-shrink: 0;" title={t('undo_settlement')}>✕</button>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Expense Context Menu Overlay -->
  {#if showExpenseMenu && menuExpense}
    <div style="position: fixed; inset: 0; z-index: 250;" onclick={closeExpenseMenu} role="button" tabindex="-1" onkeydown={(e) => e.key === 'Escape' && closeExpenseMenu()}>
      <div style="position: absolute; left: 0; right: 0; bottom: 0; background: var(--bg2); border-top: 1px solid var(--glass-border); border-radius: 16px 16px 0 0; padding: 12px 8px; padding-bottom: calc(12px + max(env(safe-area-inset-bottom), 8px)); animation: sheetSlideUp 0.2s ease-out forwards;"
        onclick={(e) => e.stopPropagation()}>
        <div style="width: 36px; height: 5px; background: var(--glass-border); border-radius: 3px; margin: 0 auto 12px;"></div>
        <div style="text-align: center; font-size: 12px; color: var(--text3); margin-bottom: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{menuExpense.description}</div>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <button onclick={() => editExpense(menuExpense)} style="display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: var(--glass); border: 1px solid var(--glass-border); border-radius: 12px; color: var(--text); font-size: 14px; cursor: pointer; width: 100%; text-align: left;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke-linecap="round" stroke-linejoin="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke-linecap="round" stroke-linejoin="round"/></svg>
            {t('edit') || 'Edit'}
          </button>
          <button onclick={() => shareExpense(menuExpense)} style="display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: var(--glass); border: 1px solid var(--glass-border); border-radius: 12px; color: var(--text); font-size: 14px; cursor: pointer; width: 100%; text-align: left;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" stroke-linecap="round"/></svg>
            {t('share') || 'Share'}
          </button>
          <button onclick={() => deleteExpense(menuExpense)} style="display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: rgba(255,77,106,0.08); border: 1px solid rgba(255,77,106,0.2); border-radius: 12px; color: var(--red); font-size: 14px; cursor: pointer; width: 100%; text-align: left;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14" stroke-linecap="round" stroke-linejoin="round"/></svg>
            {t('delete') || 'Delete'}
          </button>
        </div>
      </div>
    </div>
  {/if}

  {/if}

{:else}
  <div style="text-align: center; padding: 60px 20px;">
    <div style="font-size: 48px; margin-bottom: 16px;">🤷</div>
    <p class="text-muted">{t('group_not_found')}</p>
    <a href="/" style="margin-top: 12px; display: inline-block;">{t('go_back')}</a>
  </div>
{/if}

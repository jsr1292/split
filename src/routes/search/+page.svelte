<script lang="ts">
  import { t, getSystemLocale } from '$lib/i18n/index.js';
  const categoryEmojis: Record<string, string> = {
    food: '🍕', transport: '🚗', accommodation: '🏠', activities: '🎯',
    drinks: '🍺', shopping: '🛍️', utilities: '💡', health: '💊', other: '📌'
  };

  function fmt(n: number) {
    return new Intl.NumberFormat(getSystemLocale(), { style: 'currency', currency: 'EUR' }).format(n);
  }

  let query = $state('');
  let results: any[] = $state([]);
  let searched = $state(false);
  let loading = $state(false);
  let debounceTimer: ReturnType<typeof setTimeout>;

  async function onSearch() {
    clearTimeout(debounceTimer);
    if (query.length < 2) { results = []; searched = false; loading = false; return; }
    loading = true;
    debounceTimer = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (res.ok) results = await res.json();
      searched = true;
      loading = false;
    }, 300);
  }
</script>

<svelte:head>
  <title>Splitrr — {t('search')}</title>
</svelte:head>

<div style="margin-bottom: 12px;">
  <a href="/" style="font-size: 12px; color: var(--text3); letter-spacing: 0.05em; display: inline-flex; align-items: center; gap: 4px;">← {t('home')}</a>
</div>

<div class="form-group" style="margin-bottom: 16px;">
  <input type="text" placeholder={t('search_placeholder')} bind:value={query} oninput={onSearch} autofocus style="font-size: 16px; padding: 12px 14px;" />
</div>

{#if loading}
  <div style="text-align: center; padding: 40px 20px; color: var(--text3); font-size: 12px;">
    ...
  </div>
{:else if searched && results.length === 0}
  <div style="text-align: center; padding: 40px 20px; color: var(--text3); font-size: 12px;">
    {t('no_results')}
  </div>
{:else}
  {#each results as exp}
    <a href="/expense/{exp.id}" style="text-decoration: none; display: block;">
      <div class="glass-card card-interactive" style="display: flex; align-items: center; gap: 10px; padding: 10px 14px; margin-bottom: 10px;">
        <div class="emoji-icon" style="font-size: 18px;">{categoryEmojis[exp.category] || '📌'}</div>
        <div style="flex: 1; min-width: 0;">
          <div style="font-size: 12px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{exp.description}</div>
          <div style="font-size: 11px; color: var(--text3);">{exp.group_emoji} {exp.group_name} · {new Date(exp.date).toLocaleDateString(getSystemLocale(), { day: 'numeric', month: 'short' })}</div>
        </div>
        <div style="font-family: 'Libre Baskerville', Georgia, serif; font-weight: 600; font-size: 13px;">{fmt(exp.amount)}</div>
      </div>
    </a>
  {/each}
{/if}

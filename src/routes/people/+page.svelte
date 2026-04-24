<script lang="ts">
  import { t } from '$lib/i18n/index.js';
  let { data } = $props();
</script>

<svelte:head>
  <title>Splitrr — {t('people')}</title>
</svelte:head>

<div style="margin-bottom: 12px;">
  <a href="/" style="font-size: 12px; color: var(--text3); letter-spacing: 0.05em; display: inline-flex; align-items: center; gap: 4px;">← {t('home')}</a>
</div>

<div class="section-header" style="margin-bottom: 16px;">{t('people')}</div>

<div style="display: flex; flex-direction: column; gap: 6px;">
  {#each data.people as p}
    <a href="/people/{p.id}" style="text-decoration: none; display: block;">
      <div class="glass-card card-interactive" style="display: flex; align-items: center; gap: 12px; padding: 12px 14px; margin-bottom: 10px;">
        <div class="avatar" style="background: {p.avatar_color};">{p.name[0]}</div>
        <div style="flex: 1;">
          <div style="font-size: 12px; font-weight: 600;">
            {p.name} {p.is_self ? t('you') : ''}
            {#if !p.account_id}
              <span style="font-size: 10px; color: var(--text3); margin-left: 4px;" title={t('no_account_ghost')}>👻</span>
            {/if}
          </div>
          <div style="font-size: 11px; color: var(--text3);">{p.email || ''}</div>
        </div>
        <div style="color: var(--text3); font-size: 12px;">→</div>
      </div>
    </a>
  {/each}
</div>

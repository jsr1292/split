<script lang="ts">
  import { t, getSystemLocale } from '$lib/i18n/index.js';
  let { data } = $props();

  const fmt = (n: number) => new Intl.NumberFormat(getSystemLocale(), { style: 'currency', currency: 'EUR' }).format(n);
</script>

<svelte:head>
  <title>Splitrr — {t('groups')}</title>
</svelte:head>

<div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
  <div class="section-header" style="margin-bottom: 0; border-bottom: none; padding-bottom: 0;">{t('groups')}</div>
  <a href="/groups/new" style="font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase;">+ {t('new_group')}</a>
</div>

{#each data.groups as group}
  <a href="/groups/{group.id}" style="text-decoration: none; display: block;">
    <div class="glass-card card-interactive" style="display: flex; align-items: center; gap: 12px; padding: 12px 14px; margin-bottom: 14px;">
      <div class="emoji-icon" style="font-size: 28px; width: 40px; text-align: center; flex-shrink: 0;">{group.emoji}</div>
      <div style="flex: 1; min-width: 0;">
        <div style="font-weight: 600; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{group.name}</div>
        <div style="font-size: 11px; color: var(--text3); letter-spacing: 0.05em; margin-top: 2px;">{t('members_count', { count: group.member_count, count2: group.expense_count })}</div>
      </div>
      <div style="font-family: 'Libre Baskerville', Georgia, serif; font-weight: 700; font-size: 12px;" class:text-green={group.balance > 0} class:text-red={group.balance < 0}>
        {group.balance > 0 ? '+' : ''}{fmt(group.balance)}
      </div>
    </div>
  </a>
{/each}

{#if data.groups.length === 0}
  <div style="text-align: center; padding: 40px 20px; color: var(--text3); font-size: 12px;">
    {t('no_groups')} <a href="/groups/new">{t('create_one')}</a>
  </div>
{/if}

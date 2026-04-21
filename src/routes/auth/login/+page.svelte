<script lang="ts">
  import { t } from '$lib/i18n/index.js';
  import { goto } from '$app/navigation';

  let email = $state('');
  let password = $state('');
  let error = $state('');
  let loading = $state(false);

  async function handleLogin(e: Event) {
    e.preventDefault();
    error = '';
    loading = true;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        window.location.href = '/redirect.html';
        return;
      }

      error = data.error || t('login_error');
    } catch {
      error = t('connection_error');
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Split — {t('login_title')}</title>
</svelte:head>

<div style="min-height: 100dvh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px;">
  <div style="text-align: center; margin-bottom: 32px;">
    <div style="font-size: 48px; margin-bottom: 8px;">💰</div>
    <div style="font-family: 'Libre Baskerville', Georgia, serif; font-size: 28px; font-weight: 700; color: var(--gold);">Split</div>
    <div style="font-size: 12px; color: var(--text3); letter-spacing: 0.15em; text-transform: uppercase; margin-top: 4px;">{t('tagline')}</div>
  </div>

  <form onsubmit={handleLogin} style="width: 100%; max-width: 340px;">
    {#if error}
      <div style="background: rgba(255,77,106,0.1); border: 1px solid rgba(255,77,106,0.2); border-radius: 6px; padding: 10px 14px; margin-bottom: 12px; font-size: 12px; color: var(--red);">{error}</div>
    {/if}

    <div class="form-group">
      <label for="email">{t('email')}</label>
      <input id="email" type="email" bind:value={email} placeholder={t('email_placeholder')} required />
    </div>

    <div class="form-group">
      <label for="password">{t('password')}</label>
      <input id="password" type="password" bind:value={password} placeholder={t('password_placeholder')} required />
    </div>

    <button class="btn-gold" type="submit" style="width: 100%; padding: 12px; margin-top: 8px;" disabled={loading}>
      {loading ? t('logging_in') : t('login_btn')}
    </button>
  </form>

  <div style="margin-top: 20px; font-size: 12px; color: var(--text3);">
    {t('no_account')} <a href="/auth/register" style="color: var(--gold);">{t('create_account')}</a>
  </div>
</div>

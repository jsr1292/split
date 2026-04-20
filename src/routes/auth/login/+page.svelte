<script lang="ts">
  let { form } = $props();
  let email = $state('');
  let password = $state('');
</script>

<svelte:head>
  <title>Split — Iniciar sesión</title>
</svelte:head>

<div style="min-height: 100dvh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px;">
  <div style="text-align: center; margin-bottom: 32px;">
    <div style="font-size: 48px; margin-bottom: 8px;">💰</div>
    <div style="font-family: 'Libre Baskerville', Georgia, serif; font-size: 28px; font-weight: 700; color: var(--gold);">Split</div>
    <div style="font-size: 10px; color: var(--text3); letter-spacing: 0.15em; text-transform: uppercase; margin-top: 4px;">Dividir gastos</div>
  </div>

  <form method="POST" style="width: 100%; max-width: 340px;">
    {#if form?.error}
      <div style="background: rgba(255,77,106,0.1); border: 1px solid rgba(255,77,106,0.2); border-radius: 6px; padding: 10px 14px; margin-bottom: 12px; font-size: 12px; color: var(--red);">{form.error}</div>
    {/if}

    <div class="form-group">
      <label for="email">Email</label>
      <input id="email" type="email" name="email" bind:value={email} placeholder="tu@email.com" required />
    </div>

    <div class="form-group">
      <label for="password">Contraseña</label>
      <input id="password" type="password" name="password" bind:value={password} placeholder="••••••••" required />
    </div>

    <button class="btn-gold" type="submit" style="width: 100%; padding: 12px; margin-top: 8px;">
      Iniciar sesión
    </button>
  </form>

  <div style="margin-top: 20px; font-size: 12px; color: var(--text3);">
    ¿No tienes cuenta? <a href="/auth/register" style="color: var(--gold);">Crear cuenta</a>
  </div>
</div>

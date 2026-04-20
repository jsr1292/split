<script lang="ts">
  let name = $state('');
  let email = $state('');
  let password = $state('');
  let error = $state('');
  let loading = $state(false);

  async function handleRegister(e: Event) {
    e.preventDefault();
    error = '';
    loading = true;

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        window.location.href = '/';
        return;
      }

      error = data.error || 'Error al crear la cuenta';
    } catch {
      error = 'Error de conexión';
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Split — Crear cuenta</title>
</svelte:head>

<div style="min-height: 100dvh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px;">
  <div style="text-align: center; margin-bottom: 32px;">
    <div style="font-size: 48px; margin-bottom: 8px;">💰</div>
    <div style="font-family: 'Libre Baskerville', Georgia, serif; font-size: 28px; font-weight: 700; color: var(--gold);">Split</div>
    <div style="font-size: 10px; color: var(--text3); letter-spacing: 0.15em; text-transform: uppercase; margin-top: 4px;">Crear cuenta</div>
  </div>

  <form onsubmit={handleRegister} style="width: 100%; max-width: 340px;">
    {#if error}
      <div style="background: rgba(255,77,106,0.1); border: 1px solid rgba(255,77,106,0.2); border-radius: 6px; padding: 10px 14px; margin-bottom: 12px; font-size: 12px; color: var(--red);">{error}</div>
    {/if}

    <div class="form-group">
      <label for="name">Nombre</label>
      <input id="name" type="text" bind:value={name} placeholder="Tu nombre" required />
    </div>

    <div class="form-group">
      <label for="email">Email</label>
      <input id="email" type="email" bind:value={email} placeholder="tu@email.com" required />
    </div>

    <div class="form-group">
      <label for="password">Contraseña</label>
      <input id="password" type="password" bind:value={password} placeholder="Mínimo 6 caracteres" required />
    </div>

    <button class="btn-gold" type="submit" style="width: 100%; padding: 12px; margin-top: 8px;" disabled={loading}>
      {loading ? 'Creando...' : 'Crear cuenta'}
    </button>
  </form>

  <div style="margin-top: 20px; font-size: 12px; color: var(--text3);">
    ¿Ya tienes cuenta? <a href="/auth/login" style="color: var(--gold);">Iniciar sesión</a>
  </div>
</div>

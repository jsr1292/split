<script lang="ts">
  import { onMount } from 'svelte';

  let { data } = $props();

  let pendingCount = $state(0);
  let syncing = $state(false);
  let lastSync = $state<Date | null>(null);
  let syncMessage = $state('');

  async function checkQueue() {
    try {
      const db = await new Promise((resolve, reject) => {
        const req = indexedDB.open('split_offline', 1);
        req.onerror = () => reject(req.error);
        req.onsuccess = () => resolve(req.result);
        req.onupgradeneeded = (e) => {
          const d = e.target.result;
          if (!d.objectStoreNames.contains('queue')) {
            d.createObjectStore('queue', { keyPath: 'id', autoIncrement: true });
          }
        };
      }) as IDBDatabase;

      const tx = (db as any).transaction('queue', 'readonly');
      const store = tx.objectStore('queue');
      const countReq = store.count();
      countReq.onsuccess = () => { pendingCount = countReq.result; };
    } catch {
      pendingCount = 0;
    }
  }

  async function forceSync() {
    if (!navigator.serviceWorker?.controller) {
      syncMessage = 'Service worker not ready';
      return;
    }
    syncing = true;
    syncMessage = '';
    navigator.serviceWorker.controller.postMessage({ type: 'FORCE_SYNC' });
    // Listen for sync complete
    const handler = (e: MessageEvent) => {
      if (e.data.type === 'SYNC_COMPLETE') {
        syncing = false;
        lastSync = new Date();
        syncMessage = `${e.data.syncedCount || 0} items synced`;
        checkQueue();
      }
    };
    navigator.serviceWorker.addEventListener('message', handler);
    setTimeout(() => {
      navigator.serviceWorker.removeEventListener('message', handler);
      syncing = false;
    }, 10000);
  }

  async function verifyData() {
    syncMessage = 'Verificando...';
    const res = await fetch('/api/sync/check');
    if (res.ok) {
      const d = await res.json();
      data.syncData = d;
      syncMessage = `✓ Verificado: ${d.totals.expenses} gastos, ${d.totals.groups} grupos`;
    } else {
      syncMessage = 'Error verificando datos';
    }
  }

  onMount(() => {
    checkQueue();

    // Listen for service worker messages
    if (navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener('message', (e: MessageEvent) => {
        if (e.data.type === 'SYNC_COMPLETE') {
          syncing = false;
          lastSync = new Date();
          syncMessage = `${e.data.syncedCount || 0} items synced`;
          checkQueue();
        }
      });
    }
  });
</script>

<svelte:head>
  <title>Splitrr — Sync</title>
</svelte:head>

<div style="max-width: 480px; margin: 0 auto; padding: 20px 16px 80px;">

  <div style="margin-bottom: 12px;">
    <a href="javascript:history.back()" style="font-size: 12px; color: var(--text3); letter-spacing: 0.05em; display: inline-flex; align-items: center; gap: 4px;">
      ← Back
    </a>
  </div>

  <div class="section-header" style="margin-bottom: 16px;">Sync Status</div>

  {#if syncMessage}
    <div style="background: rgba(0,229,160,0.1); border: 1px solid rgba(0,229,160,0.2); border-radius: 6px; padding: 10px 14px; margin-bottom: 12px; font-size: 12px; color: var(--green);">
      {syncMessage}
    </div>
  {/if}

  <!-- Totals Card -->
  <div class="glass-card" style="margin-bottom: 12px;">
    <div style="font-size: 11px; color: var(--text3); letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 12px;">Server Totals</div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
      <div style="background: var(--bg2); border-radius: 6px; padding: 10px; text-align: center;">
        <div style="font-size: 20px; font-family: 'Libre Baskerville', Georgia, serif; color: var(--gold);">{data.syncData?.totals?.expenses ?? 0}</div>
        <div style="font-size: 10px; color: var(--text3); letter-spacing: 0.05em; margin-top: 2px;">EXPENSES</div>
      </div>
      <div style="background: var(--bg2); border-radius: 6px; padding: 10px; text-align: center;">
        <div style="font-size: 20px; font-family: 'Libre Baskerville', Georgia, serif; color: var(--gold);">{data.syncData?.totals?.groups ?? 0}</div>
        <div style="font-size: 10px; color: var(--text3); letter-spacing: 0.05em; margin-top: 2px;">GROUPS</div>
      </div>
      <div style="background: var(--bg2); border-radius: 6px; padding: 10px; text-align: center;">
        <div style="font-size: 20px; font-family: 'Libre Baskerville', Georgia, serif; color: var(--gold);">{data.syncData?.totals?.people ?? 0}</div>
        <div style="font-size: 10px; color: var(--text3); letter-spacing: 0.05em; margin-top: 2px;">PEOPLE</div>
      </div>
      <div style="background: var(--bg2); border-radius: 6px; padding: 10px; text-align: center;">
        <div style="font-size: 20px; font-family: 'Libre Baskerville', Georgia, serif; color: var(--gold);">{data.syncData?.totals?.settlements ?? 0}</div>
        <div style="font-size: 10px; color: var(--text3); letter-spacing: 0.05em; margin-top: 2px;">SETTLEMENTS</div>
      </div>
    </div>
  </div>

  <!-- Groups Card -->
  {#if data.syncData?.groups?.length > 0}
    <div class="glass-card" style="margin-bottom: 12px;">
      <div style="font-size: 11px; color: var(--text3); letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 12px;">Groups</div>
      {#each data.syncData.groups as g}
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--border); font-size: 12px;">
          <span style="color: var(--text2);">{g.name}</span>
          <span style="color: var(--text3); font-size: 11px;">{g.expenseCount} exp · {g.memberCount} mem</span>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Pending Queue Card -->
  <div class="glass-card" style="margin-bottom: 12px;">
    <div style="font-size: 11px; color: var(--text3); letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 12px;">Offline Queue</div>
    <div style="display: flex; align-items: center; justify-content: space-between;">
      <div>
        <div style="font-size: 24px; font-family: 'Libre Baskerville', Georgia, serif; color: {pendingCount > 0 ? 'var(--gold)' : 'var(--green)'};">{pendingCount}</div>
        <div style="font-size: 10px; color: var(--text3);">pending items</div>
      </div>
      {#if lastSync}
        <div style="font-size: 10px; color: var(--text3); text-align: right;">
          Last sync: {lastSync.toLocaleTimeString()}
        </div>
      {/if}
    </div>
  </div>

  <!-- Actions -->
  <div style="display: flex; flex-direction: column; gap: 8px;">
    <button class="btn-gold" onclick={verifyData} style="width: 100%; padding: 12px;">
      Verificar
    </button>
    <button
      class="btn-outline"
      onclick={forceSync}
      disabled={syncing || pendingCount === 0}
      style="width: 100%; padding: 12px; {syncing || pendingCount === 0 ? 'opacity: 0.5;' : ''}"
    >
      {syncing ? 'Sincronizando...' : 'Forzar sincronización'}
    </button>
  </div>

</div>

<style>
  .glass-card {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 16px;
  }

  .btn-outline {
    background: transparent;
    border: 1px solid var(--gold-dim);
    border-radius: 8px;
    color: var(--gold);
    font-family: inherit;
    font-size: 13px;
    letter-spacing: 0.05em;
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-outline:hover:not(:disabled) {
    background: rgba(201, 168, 76, 0.1);
  }
</style>

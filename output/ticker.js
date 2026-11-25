/**
 * @file Battement régulier pour l'ordonnanceur : Worker si possible, `setInterval` sinon.
 */

/**
 * Appelle `fn` toutes les `interval` ms.
 * @param {() => void} fn
 * @param {number} [interval=25] Période (ms).
 * @returns {{stop: () => void, kind: 'worker'|'interval'}} De quoi arrêter, et la méthode utilisée.
 */
export function startTicker(fn, interval = 25) {
  if (typeof Worker !== 'undefined') {
    try {
      const w = new Worker(new URL('./ticker-worker.js', import.meta.url), { type: 'module' });
      w.onmessage = () => fn();
      w.postMessage({ interval });
      return { kind: 'worker', stop: () => { w.postMessage({ stop: true }); w.terminate(); } };
    } catch { /* Worker refusé : repli sur setInterval */ }
  }
  const id = setInterval(fn, interval);
  return { kind: 'interval', stop: () => clearInterval(id) };
}

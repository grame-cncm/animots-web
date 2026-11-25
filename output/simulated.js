/**
 * @file Sortie simulée : reçoit les messages sans rien jouer, et les rend visibles au moment où
 * ils seraient joués. Sert à essayer le lecteur et l'interface sans Kontakt ni MIDI.
 */

/**
 * Message reçu par la sortie simulée.
 * @typedef {object} SimMessage
 * @property {number} port
 * @property {Array<number>} data
 * @property {number} time Heure prévue (ms).
 */

/** Sortie simulée conforme à l'interface `Sink` de `output/player.js`. */
export class SimulatedSink {
  /**
   * @param {object} [options]
   * @param {Array<number>} [options.ports=[0, 1]] Ports considérés comme reliés.
   * @param {number} [options.keep=5000] Nombre de messages gardés en mémoire.
   */
  constructor({ ports = [0, 1], keep = 5000 } = {}) {
    this.connected = ports;
    this.keep = keep;
    /** @type {Array<SimMessage>} Messages reçus, triés par heure, les plus anciens oubliés. */
    this.messages = [];
    /** Nombre total de messages reçus. */
    this.count = 0;
  }

  /**
   * Garde le message.
   * @param {number} port
   * @param {Array<number>} data
   * @param {number} time
   * @returns {void}
   */
  send(port, data, time) {
    this.count++;
    this.messages.push({ port, data, time });
    if (this.messages.length > this.keep) this.messages.splice(0, this.messages.length - this.keep);
  }

  /**
   * Ports considérés comme reliés.
   * @returns {Array<number>}
   */
  ports() { return this.connected; }

  /**
   * Notes qui sonnent à un instant donné, d'après les messages reçus.
   * @param {number} t Heure (ms).
   * @returns {Set<string>} Clés « port:canal » des canaux qui jouent.
   */
  soundingAt(t) {
    const on = new Map();
    // les messages arrivent presque dans l'ordre du temps (les fins de notes longues d'une partie
    // arrivent après le début de la suivante) : on les relit triés
    const sorted = [...this.messages].sort((a, b) => a.time - b.time);
    for (const m of sorted) {
      if (m.time > t) break;
      const kind = m.data[0] & 0xf0, key = `${m.port}:${m.data[0] & 15}:${m.data[1]}`;
      if (kind === 0x90) on.set(key, (on.get(key) ?? 0) + 1);
      else if (kind === 0x80) { const k = (on.get(key) ?? 0) - 1; if (k > 0) on.set(key, k); else on.delete(key); }
      else if (kind === 0xb0 && (m.data[1] === 123 || m.data[1] === 120)) {
        for (const kk of [...on.keys()]) if (kk.startsWith(`${m.port}:${m.data[0] & 15}:`)) on.delete(kk);
      }
    }
    return new Set([...on.keys()].map((k) => k.split(':').slice(0, 2).join(':')));
  }
}

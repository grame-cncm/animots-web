/**
 * @file Sortie MIDI pour Node.js (exécuteur headless), avec `@julusian/midi` (RtMidi, CoreMIDI
 * sous macOS).
 *
 * RtMidi envoie chaque message tout de suite : il n'accepte pas de date future comme le Web MIDI.
 * {@link ScheduledSink} ajoute donc une file d'attente datée, vidée toutes les millisecondes :
 * l'ordonnanceur (`output/player.js`) lui confie les messages une seconde à l'avance, comme au
 * Web MIDI, et elle les envoie à l'heure (gigue d'environ 1 ms). Contrairement au Web MIDI, elle
 * peut annuler ce qui est programmé (`clear`), ce qui rend l'arrêt immédiat.
 *
 * Deux façons de relier les ports A et B :
 * - ports virtuels créés par le programme (« Animots A », « Animots B »), que Kontakt 8 voit
 *   comme des entrées MIDI, sans bus IAC ;
 * - sorties existantes du système, choisies par une partie de leur nom (un bus IAC, une
 *   interface MIDI).
 *
 * `@julusian/midi` est une dépendance optionnelle (module natif) : elle n'est chargée qu'à
 * l'ouverture, et seulement par l'exécuteur headless.
 */

/**
 * Message en attente.
 * @typedef {object} Pending
 * @property {number} time Heure d'envoi (ms, horloge du lecteur).
 * @property {number} port
 * @property {Array<number>} data
 * @property {number} seq Ordre d'arrivée, pour garder l'ordre des messages de même heure.
 */

/** Sortie à file d'attente datée, conforme à l'interface `Sink` de `output/player.js`. */
export class ScheduledSink {
  /**
   * @param {object} options
   * @param {(port: number, data: Array<number>) => void} options.sendNow Envoie un message immédiatement.
   * @param {() => Array<number>} options.ports Ports reliés.
   * @param {() => number} [options.now] Horloge (ms), `performance.now` par défaut.
   */
  constructor({ sendNow, ports, now = () => performance.now() }) {
    this.sendNow = sendNow;
    this.portList = ports;
    this.now = now;
    /** @type {Array<Pending>} File triée par heure, puis par ordre d'arrivée. */
    this.queue = [];
    /** Nombre de messages envoyés. */
    this.sent = 0;
    /** Plus grand retard constaté à l'envoi (ms). */
    this.maxLate = 0;
    this.seq = 0;
    /** @type {ReturnType<typeof setInterval> | null} */
    this.timer = null;
  }

  /**
   * Programme un message. Insertion triée par heure (les messages arrivent presque dans l'ordre :
   * la recherche part de la fin).
   * @param {number} port
   * @param {Array<number>} data
   * @param {number} time Heure d'envoi (ms).
   * @returns {void}
   */
  send(port, data, time) {
    const m = { time, port, data, seq: this.seq++ };
    let k = this.queue.length;
    while (k > 0 && this.queue[k - 1].time > time) k--;
    this.queue.splice(k, 0, m);
  }

  /**
   * Envoie les messages dont l'heure est venue.
   * @returns {void}
   */
  flush() {
    const t = this.now();
    let n = 0;
    while (n < this.queue.length && this.queue[n].time <= t) {
      const m = this.queue[n++];
      this.maxLate = Math.max(this.maxLate, t - m.time);
      this.sendNow(m.port, m.data);
      this.sent++;
    }
    if (n) this.queue.splice(0, n);
  }

  /**
   * Annule tous les messages programmés.
   * @returns {void}
   */
  clear() { this.queue = []; }

  /**
   * Ports reliés.
   * @returns {Array<number>}
   */
  ports() { return this.portList(); }

  /**
   * Démarre le vidage automatique de la file.
   * @param {number} [interval=1] Période (ms).
   * @returns {void}
   */
  start(interval = 1) {
    if (!this.timer) this.timer = setInterval(() => this.flush(), interval);
  }

  /**
   * Arrête le vidage automatique (après un dernier vidage).
   * @returns {void}
   */
  stopTimer() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    this.flush();
  }
}

/**
 * Charge le module natif `@julusian/midi`.
 * @returns {Promise<any>}
 * @throws {Error} Avec la commande d'installation si le module est absent.
 */
async function loadMidi() {
  try {
    const mod = await import('@julusian/midi');
    return mod.default ?? mod;
  } catch (e) {
    throw new Error(`module @julusian/midi indisponible (${e.message}) : lancer « npm install » dans animots-web`);
  }
}

/**
 * Sorties MIDI du système.
 * @returns {Promise<Array<string>>} Noms des sorties.
 */
export async function listOutputs() {
  const midi = await loadMidi();
  const o = new midi.Output();
  const names = [];
  for (let k = 0; k < o.getPortCount(); k++) names.push(o.getPortName(k));
  o.closePort?.();
  return names;
}

/**
 * Ouvre la sortie MIDI de l'exécuteur : un port de sortie par port de la partition (A, B).
 * @param {object} [options]
 * @param {Array<string|null>} [options.targets=[null, null]] Pour chaque port : partie du nom d'une
 *   sortie existante, ou null pour créer un port virtuel.
 * @param {Array<string>} [options.virtualNames=['Animots A', 'Animots B']] Noms des ports virtuels.
 * @returns {Promise<ScheduledSink & {close: () => void, names: Array<string>}>} Sortie démarrée,
 *   avec `close()` et le nom de chaque port ouvert.
 * @throws {Error} Si une sortie demandée n'existe pas (le message liste les sorties disponibles).
 */
export async function openNodeMidi({ targets = [null, null], virtualNames = ['Animots A', 'Animots B'] } = {}) {
  const midi = await loadMidi();
  const outputs = [], names = [];
  targets.forEach((target, port) => {
    const out = new midi.Output();
    if (target) {
      const available = [];
      for (let k = 0; k < out.getPortCount(); k++) available.push(out.getPortName(k));
      const k = available.findIndex((n) => n.toLowerCase().includes(target.toLowerCase()));
      if (k < 0) throw new Error(`sortie « ${target} » introuvable pour le port ${'AB'[port]}. Disponibles : ${available.join(', ') || 'aucune'}`);
      out.openPort(k);
      names.push(available[k]);
    } else {
      out.openVirtualPort(virtualNames[port]);
      names.push(`${virtualNames[port]} (virtuel)`);
    }
    outputs.push(out);
  });
  const sink = new ScheduledSink({
    sendNow: (port, data) => outputs[port]?.sendMessage(data),
    ports: () => outputs.map((_, k) => k),
  });
  sink.start();
  return Object.assign(sink, {
    names,
    close() {
      sink.stopTimer();
      for (const o of outputs) o.closePort();
    },
  });
}

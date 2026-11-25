/**
 * @file Ordonnanceur de lecture : joue des partitions en temps réel vers une sortie MIDI.
 *
 * Remplace le lecteur MidiShare de CLCE (`player`, `start-sequence`, `next-sequence`,
 * `stop-sequence`, Gerland2013-4.lsp lignes 345 à 371). Il ne dépend d'aucune plateforme : la
 * sortie (Web MIDI, simulée, ou Node) et l'horloge lui sont données. Les tests le pilotent avec
 * une horloge factice.
 *
 * ## Principe : anticipation
 *
 * À chaque battement (`tick()`, toutes les 25 ms environ), l'ordonnanceur envoie à la sortie
 * tous les messages dont l'heure tombe avant `maintenant + anticipation` (une seconde par
 * défaut), avec leur heure exacte (`timestamp` du Web MIDI). La précision ne dépend donc pas de
 * la régularité du battement : un battement en retard, jusqu'à la durée d'anticipation, ne
 * décale rien.
 *
 * ## Enchaînement des parties
 *
 * En mode boucle, la partie suivante est calculée dès que la partie courante commence, puis
 * placée exactement à sa fin (`score.end`). L'original attendait la fin pour calculer la suite,
 * ce qui ajoutait le temps de calcul entre deux parties.
 *
 * ## Arrêt
 *
 * Un message déjà envoyé avec une heure future ne peut plus être annulé (`MIDIOutput.clear()`
 * n'est pas fiable selon les navigateurs). À l'arrêt, l'ordonnanceur envoie donc un note-off
 * pour chaque note active, puis « all notes off » (CC123) et « all sound off » (CC120) sur
 * tous les canaux des ports utilisés, une fois tout de suite et une fois après la fenêtre
 * d'anticipation, pour couper aussi les notes déjà programmées.
 */

/**
 * Sortie MIDI vue par l'ordonnanceur.
 * @typedef {object} Sink
 * @property {(port: number, data: Array<number>, time: number) => void} send Envoie un message
 *   sur un port (0 = A, 1 = B...) à une heure de l'horloge (ms).
 * @property {() => Array<number>} ports Ports reliés à une sortie réelle.
 * @property {() => void} [clear] Annule les messages programmés, si la sortie le sait.
 */

/**
 * Partie en cours de lecture.
 * @typedef {object} Playing
 * @property {import('../core/score.js').Score} score
 * @property {number} start Heure de début (ms, horloge du lecteur).
 * @property {number} end Heure de fin (ms).
 * @property {Array<{time: number, port: number, data: Array<number>, kind: string}>} msgs Messages datés.
 * @property {number} next Indice du prochain message à envoyer.
 * @property {boolean} announced Début déjà signalé par `onPart`.
 */

/** Ordonnanceur de lecture. */
export class Player {
  /**
   * @param {object} options
   * @param {Sink} options.sink Sortie MIDI.
   * @param {() => number} [options.now] Horloge en millisecondes (`performance.now` par défaut).
   * @param {number} [options.lookahead=1000] Fenêtre d'anticipation (ms).
   * @param {number} [options.startDelay=200] Délai avant la première note après un démarrage (ms).
   * @param {(score: import('../core/score.js').Score, start: number, end: number) => void} [options.onPart]
   *   Appelée quand une partie commence à sonner.
   * @param {(state: 'arrêt'|'boucle'|'unique') => void} [options.onState] Appelée à chaque changement d'état.
   */
  constructor({ sink, now = () => performance.now(), lookahead = 1000, startDelay = 200, onPart = () => {}, onState = () => {} }) {
    this.sink = sink;
    this.now = now;
    this.lookahead = lookahead;
    this.startDelay = startDelay;
    this.onPart = onPart;
    this.onState = onState;
    /** @type {'arrêt'|'boucle'|'unique'} */
    this.state = 'arrêt';
    /** @type {Array<Playing>} Parties programmées (la courante, puis la suivante). */
    this.queue = [];
    /** @type {(() => import('../core/score.js').Score) | null} Calcul de la partie suivante (boucle). */
    this.nextPart = null;
    /** @type {Map<string, number>} Notes actives : « port:canal:hauteur » -> nombre de note-on en cours. */
    this.active = new Map();
    /** Nombre de messages envoyés depuis la création. */
    this.sent = 0;
  }

  /**
   * Prépare une partition pour la lecture à partir d'une heure donnée.
   * @param {import('../core/score.js').Score} score
   * @param {number} start Heure de début (ms).
   * @returns {Playing}
   */
  schedule(score, start) {
    const toSec = score.timeline();
    const msgs = score.messages().filter((m) => m.kind !== 'tempo')
      .map((m) => ({ time: start + toSec(m.tick) * 1000, port: m.port, data: m.data, kind: m.kind }));
    return { score, start, end: start + toSec(score.end) * 1000, msgs, next: 0, announced: false };
  }

  /**
   * `start-sequence` : démarre la boucle des parties. Arrête d'abord ce qui joue.
   * @param {() => import('../core/score.js').Score} nextPart Calcule la partie suivante (`calcul-partie`).
   * @returns {void}
   */
  startLoop(nextPart) {
    this.stop();
    this.nextPart = nextPart;
    this.queue = [this.schedule(nextPart(), this.now() + this.startDelay)];
    this.setState('boucle');
    this.tick();
  }

  /**
   * Joue une seule partition (un essai de la fenêtre), puis s'arrête. Arrête d'abord ce qui joue.
   * @param {import('../core/score.js').Score} score
   * @returns {void}
   */
  playOnce(score) {
    this.stop();
    this.nextPart = null;
    this.queue = [this.schedule(score, this.now() + this.startDelay)];
    this.setState('unique');
    this.tick();
  }

  /**
   * Battement : envoie les messages de la fenêtre d'anticipation, enchaîne les parties, signale
   * les débuts de partie. À appeler régulièrement (25 ms environ).
   * @returns {void}
   */
  tick() {
    if (this.state === 'arrêt') return;
    const t = this.now(), horizon = t + this.lookahead;
    // en boucle, la partie suivante est calculée dès que la courante est seule dans la file
    if (this.state === 'boucle' && this.queue.length === 1 && this.nextPart) {
      this.queue.push(this.schedule(this.nextPart(), this.queue[0].end));
    }
    for (const p of this.queue) {
      while (p.next < p.msgs.length && p.msgs[p.next].time <= horizon) this.emit(p.msgs[p.next++]);
      if (!p.announced && p.start <= t) { p.announced = true; this.onPart(p.score, p.start, p.end); }
    }
    // une partie est finie quand tout est envoyé et que sa fin est passée
    while (this.queue.length && this.queue[0].next >= this.queue[0].msgs.length && this.queue[0].end <= t) this.queue.shift();
    if (this.queue.length === 0) this.setState('arrêt');
  }

  /**
   * Envoie un message et met à jour les notes actives.
   * @param {{time: number, port: number, data: Array<number>, kind: string}} m
   * @returns {void}
   */
  emit(m) {
    const key = `${m.port}:${m.data[0] & 15}:${m.data[1]}`;
    if (m.kind === 'noteon') this.active.set(key, (this.active.get(key) ?? 0) + 1);
    else if (m.kind === 'noteoff') {
      const k = (this.active.get(key) ?? 0) - 1;
      if (k > 0) this.active.set(key, k); else this.active.delete(key);
    }
    this.sink.send(m.port, m.data, m.time);
    this.sent++;
  }

  /**
   * `stop-sequence` : arrête la lecture et coupe le son (voir l'en-tête du fichier).
   * @returns {void}
   */
  stop() {
    const wasPlaying = this.state !== 'arrêt' || this.active.size > 0;
    this.queue = [];
    this.nextPart = null;
    if (wasPlaying) {
      const t = this.now();
      this.sink.clear?.();
      for (const key of this.active.keys()) {
        const [port, chan, pitch] = key.split(':').map(Number);
        this.sink.send(port, [0x80 | chan, pitch, 0], t);
      }
      this.active.clear();
      for (const when of [t, t + this.lookahead + 50]) {
        for (const port of this.sink.ports()) {
          for (let chan = 0; chan < 16; chan++) {
            this.sink.send(port, [0xb0 | chan, 123, 0], when);
            this.sink.send(port, [0xb0 | chan, 120, 0], when);
          }
        }
      }
    }
    this.setState('arrêt');
  }

  /**
   * Partie qui sonne actuellement, ou null.
   * @returns {Playing | null}
   */
  current() {
    const t = this.now();
    return this.queue.find((p) => p.start <= t && t < p.end) ?? null;
  }

  /**
   * Change d'état et le signale.
   * @param {'arrêt'|'boucle'|'unique'} s
   * @returns {void}
   */
  setState(s) {
    if (this.state !== s) { this.state = s; this.onState(s); }
  }
}

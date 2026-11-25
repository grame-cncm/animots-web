/**
 * @file Partition : liste d'événements MIDI datés en ticks, avec un curseur d'écriture.
 *
 * Remplace la séquence MidiShare `*out*` de CLCE et ses fonctions de curseur (`p-abs`, `p-rel`,
 * `date?`, 3Note-Midi-Finale.lisp). Comme en Lisp, les processus écrivent l'un après l'autre
 * dans la même partition, chacun en replaçant le curseur à son début ; l'ordre des événements
 * est rétabli par {@link Score#messages}.
 *
 * L'écriture d'une note reprend la fonction Lisp `NOTES` :
 * - une note demandée à la date 0 est écrite au tick 1, pour que les contrôleurs placés à la
 *   date 0 (CC9 de `place-prog`) passent avant elle ;
 * - la durée MIDI est `floor(durée × stac) − 1` tick ;
 * - la hauteur peut être fractionnaire : le pitch-bend du canal porte la fraction (échelle de
 *   ±7 demi-tons, `*bend*` de CLCE) et la note la hauteur arrondie au pair. CLCE envoie un
 *   pitch-bend avant CHAQUE note, au tick précédent. La partition garde ce pitch-bend sur chaque
 *   note, et {@link Score#messages} n'émet que ceux qui changent la valeur du canal, dans l'ordre
 *   du temps (pas dans l'ordre d'écriture, car les processus se chevauchent) ;
 * - une note de vélocité 0 n'est pas envoyée (un note-on de vélocité 0 est un note-off), mais
 *   elle compte dans la durée de la partition : c'est ainsi que la séquence 1 fait un silence.
 *
 * Numérotation : un super-canal CLCE va de 0 à 31 ; port = super-canal ÷ 16 (0 = A, 1 = B),
 * canal MIDI = super-canal mod 16 (0 à 15, soit les canaux 1 à 16).
 */

import { clRound } from './lisp.js';
import { PPQ } from './rhythm.js';

/** Étendue du pitch-bend en demi-tons (`*bend*` = 7 dans 4Processus.lisp). */
export const BEND_RANGE = 7;

/**
 * Note écrite dans la partition.
 * @typedef {object} NoteEvent
 * @property {'note'} type
 * @property {number} tick Date de début (ticks).
 * @property {number} port 0 (A) ou 1 (B).
 * @property {number} chan Canal MIDI, de 0 à 15.
 * @property {number} pitch Hauteur MIDI entière.
 * @property {number} dur Durée (ticks).
 * @property {number} vel Vélocité.
 * @property {number} bend Pitch-bend du canal pour cette note (−8192 à 8191, 0 au centre).
 * @property {number} bendTick Date du pitch-bend (le tick qui précède la note demandée).
 */

/**
 * Contrôleur, pitch-bend ou tempo.
 * @typedef {object} ControlEvent
 * @property {'cc'|'bend'|'tempo'} type
 * @property {number} tick
 * @property {number} [port]
 * @property {number} [chan]
 * @property {number} [ctrl] Numéro de contrôleur (type 'cc').
 * @property {number} [value] Valeur du contrôleur, ou du pitch-bend de −8192 à 8191.
 * @property {number} [bpm] Tempo (type 'tempo').
 */

/**
 * Message MIDI prêt à envoyer.
 * @typedef {object} MidiMessage
 * @property {number} tick
 * @property {number} port 0 (A) ou 1 (B) ; -1 pour un tempo (méta-événement).
 * @property {Array<number>} data Octets MIDI (statut et données), ou `[bpm]` pour un tempo.
 * @property {'noteoff'|'cc'|'bend'|'tempo'|'noteon'} kind
 */

/**
 * Borne une valeur dans [0, 127] et l'arrondit (données MIDI sur 7 bits).
 * @param {number} v
 * @returns {number}
 */
const midi7 = (v) => Math.max(0, Math.min(127, Math.round(v)));

/** Partition MIDI avec curseur d'écriture. */
export class Score {
  constructor() {
    /** @type {Array<NoteEvent|ControlEvent>} Événements dans l'ordre d'écriture. */
    this.events = [];
    /** Fin de la partition (ticks) : fin de la dernière note, notes muettes comprises. */
    this.end = 0;
    /** Position du curseur (ticks). */
    this.cursor = 0;
    /** Nom de la séquence en cours (`print-dialog`). */
    this.label = '';
    /** @type {Array<string>} Anomalies relevées (valeurs MIDI hors limites...). */
    this.warnings = [];
  }

  /**
   * `(p-abs date)` : place le curseur à une date absolue.
   * @param {number} tick
   * @returns {void}
   */
  pAbs(tick) { this.cursor = tick; }

  /**
   * `(p-rel dur)` : déplace le curseur.
   * @param {number} ticks
   * @returns {void}
   */
  pRel(ticks) { this.cursor += ticks; }

  /**
   * `(date?)` : position du curseur.
   * @returns {number}
   */
  date() { return this.cursor; }

  /**
   * `NOTES` : écrit une note au curseur, sans le déplacer.
   * @param {number} superchan Super-canal (0 à 31).
   * @param {number} pitch Hauteur, éventuellement fractionnaire (60.5 = do + 1/4 de ton).
   * @param {number} dur Durée de la note (ticks), avant le staccato.
   * @param {number} vel Vélocité ; 0 donne une note muette.
   * @param {number} [stac=1] Coefficient de staccato.
   * @returns {void}
   */
  note(superchan, pitch, dur, vel, stac = 1) {
    const port = Math.floor(superchan / 16), chan = superchan % 16;
    const tick = this.cursor === 0 ? 1 : this.cursor;
    const bend = Math.round((8192 / BEND_RANGE) * (pitch - clRound(pitch)));
    const bendTick = Math.max(0, this.cursor - 1);
    const d = Math.floor(dur * stac) - 1;
    this.end = Math.max(this.end, tick + d);
    if (vel <= 0) return;
    const p = clRound(pitch);
    if (p < 0 || p > 127 || vel > 127 || superchan < 0 || superchan > 31) {
      this.warnings.push(`note hors limites : canal ${superchan}, hauteur ${pitch}, vélocité ${vel} au tick ${tick}`);
    }
    this.events.push({ type: 'note', tick, port, chan, pitch: p, dur: Math.max(0, d), vel, bend, bendTick });
  }

  /**
   * Écrit un contrôleur (`ctrl-change`) à une date donnée.
   * @param {number} tick
   * @param {number} port 0 (A) ou 1 (B).
   * @param {number} chan Canal MIDI (0 à 15).
   * @param {number} ctrl Numéro de contrôleur.
   * @param {number} value Valeur (0 à 127).
   * @returns {void}
   */
  cc(tick, port, chan, ctrl, value) { this.events.push({ type: 'cc', tick, port, chan, ctrl, value }); }

  /**
   * `(place-tempo date bpm)` : changement de tempo.
   * @param {number} tick
   * @param {number} bpm Noires par minute.
   * @returns {void}
   */
  tempo(tick, bpm) { this.events.push({ type: 'tempo', tick, bpm }); }

  /**
   * Notes de la partition, triées par date.
   * @returns {Array<NoteEvent>}
   */
  notes() {
    return /** @type {Array<NoteEvent>} */ (this.events.filter((e) => e.type === 'note')).sort((a, b) => a.tick - b.tick);
  }

  /**
   * Messages MIDI triés : à tick égal, les note-off passent d'abord, puis tempos, contrôleurs
   * et pitch-bends, puis les note-on. Une note répétée sur le même canal est donc relâchée
   * avant d'être rejouée. Les données sont bornées à 7 bits.
   *
   * Le pitch-bend de chaque note n'est émis que s'il change la valeur courante du canal (ou
   * si le canal n'en a encore reçu aucun), en parcourant les messages dans l'ordre du temps.
   * @returns {Array<MidiMessage>}
   */
  messages() {
    const order = { noteoff: 0, tempo: 1, cc: 2, bend: 3, noteon: 4 };
    const out = [];
    for (const e of this.events) {
      if (e.type === 'note') {
        const v = Math.max(0, Math.min(16383, e.bend + 8192));
        out.push({ tick: e.bendTick, port: e.port, kind: 'bend', data: [0xe0 | e.chan, v & 127, v >> 7] });
        out.push({ tick: e.tick, port: e.port, kind: 'noteon', data: [0x90 | e.chan, midi7(e.pitch), Math.max(1, midi7(e.vel))] });
        out.push({ tick: e.tick + e.dur, port: e.port, kind: 'noteoff', data: [0x80 | e.chan, midi7(e.pitch), 0] });
      } else if (e.type === 'cc') {
        out.push({ tick: e.tick, port: e.port, kind: 'cc', data: [0xb0 | e.chan, e.ctrl & 127, midi7(e.value)] });
      } else if (e.type === 'bend') {
        const v = Math.max(0, Math.min(16383, e.value + 8192));
        out.push({ tick: e.tick, port: e.port, kind: 'bend', data: [0xe0 | e.chan, v & 127, v >> 7] });
      } else if (e.type === 'tempo') {
        out.push({ tick: e.tick, port: -1, kind: 'tempo', data: [e.bpm] });
      }
    }
    const sorted = out.map((m, k) => ({ m, k }))
      .sort((a, b) => a.m.tick - b.m.tick || order[a.m.kind] - order[b.m.kind] || a.k - b.k)
      .map((x) => x.m);
    const current = new Map(); // valeur de pitch-bend courante par (port, canal)
    return sorted.filter((m) => {
      if (m.kind !== 'bend') return true;
      const key = m.port * 16 + (m.data[0] & 15), value = m.data[1] | (m.data[2] << 7);
      if (current.get(key) === value) return false;
      current.set(key, value);
      return true;
    });
  }

  /**
   * Convertit une date en secondes d'après les tempos de la partition (60 par défaut).
   * @param {number} tick
   * @returns {number}
   */
  seconds(tick) {
    const tempos = /** @type {Array<ControlEvent>} */ (this.events.filter((e) => e.type === 'tempo')).sort((a, b) => a.tick - b.tick);
    let t = 0, last = 0, bpm = 60;
    for (const e of tempos) {
      if (e.tick >= tick) break;
      t += ((e.tick - last) / PPQ) * (60 / bpm);
      last = e.tick; bpm = e.bpm;
    }
    return t + ((tick - last) / PPQ) * (60 / bpm);
  }
}

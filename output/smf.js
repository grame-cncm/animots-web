/**
 * @file Export d'une partition en fichier MIDI standard (SMF).
 *
 * Format 1 : une piste de tempo, puis une piste par port (A, puis B), chacune marquée par le
 * méta-événement « MIDI port » (FF 21) pour que les séquenceurs qui le comprennent rendent les
 * 32 canaux. Résolution : 5 040 ticks par noire, comme `noi` dans CLCE.
 *
 * Le fichier sert à écouter et à comparer les parties hors temps réel (dans un séquenceur relié
 * à Kontakt), pas à jouer l'installation, qui passe par le lecteur MIDI.
 */

import { PPQ } from '../core/rhythm.js';

/**
 * Nombre en longueur variable (VLQ) du format SMF.
 * @param {number} n Entier positif.
 * @returns {Array<number>}
 */
function vlq(n) {
  const b = [n & 0x7f];
  while ((n >>= 7)) b.unshift((n & 0x7f) | 0x80);
  return b;
}

/**
 * Entier 32 bits gros-boutiste.
 * @param {number} n
 * @returns {Array<number>}
 */
const u32 = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];

/**
 * Bloc de piste `MTrk` à partir de messages déjà triés.
 * @param {Array<{tick: number, data: Array<number>}>} msgs Messages triés par date.
 * @returns {Array<number>}
 */
function track(msgs) {
  const bytes = [];
  let last = 0;
  for (const m of msgs) {
    bytes.push(...vlq(m.tick - last), ...m.data);
    last = m.tick;
  }
  bytes.push(0, 0xff, 0x2f, 0); // fin de piste
  return [0x4d, 0x54, 0x72, 0x6b, ...u32(bytes.length), ...bytes];
}

/**
 * Encode une partition en fichier MIDI standard, format 1.
 * @param {import('../core/score.js').Score} score
 * @returns {Uint8Array} Octets du fichier `.mid`.
 * @example writeFileSync('sequence2.mid', toSMF(score))
 */
export function toSMF(score) {
  const msgs = score.messages();
  const tempos = msgs.filter((m) => m.kind === 'tempo');
  const tempoTrack = (tempos.length ? tempos : [{ tick: 0, data: [60] }]).map((m) => {
    const mpq = Math.round(60e6 / m.data[0]); // microsecondes par noire
    return { tick: m.tick, data: [0xff, 0x51, 3, (mpq >> 16) & 255, (mpq >> 8) & 255, mpq & 255] };
  });
  const tracks = [track(tempoTrack)];
  for (const port of [0, 1]) {
    tracks.push(track([
      { tick: 0, data: [0xff, 0x21, 1, port] },
      ...msgs.filter((m) => m.port === port),
    ]));
  }
  const header = [0x4d, 0x54, 0x68, 0x64, ...u32(6), 0, 1, 0, tracks.length, (PPQ >> 8) & 255, PPQ & 255];
  return new Uint8Array([...header, ...tracks.flat()]);
}

/**
 * Relit un fichier produit par {@link toSMF} et en compte les événements. Sert aux tests et à
 * vérifier un export.
 * @param {Uint8Array} bytes
 * @returns {{format: number, tracks: number, ppq: number, noteOn: number, noteOff: number, cc: number, bend: number, meta: number, lastTick: number}}
 * @throws {Error} Si la structure du fichier est invalide.
 */
export function inspectSMF(bytes) {
  const b = bytes;
  const str = (p) => String.fromCharCode(b[p], b[p + 1], b[p + 2], b[p + 3]);
  const r32 = (p) => ((b[p] << 24) | (b[p + 1] << 16) | (b[p + 2] << 8) | b[p + 3]) >>> 0;
  if (str(0) !== 'MThd') throw new Error('en-tête MThd absent');
  const res = { format: (b[8] << 8) | b[9], tracks: (b[10] << 8) | b[11], ppq: (b[12] << 8) | b[13], noteOn: 0, noteOff: 0, cc: 0, bend: 0, meta: 0, lastTick: 0 };
  let p = 14;
  for (let k = 0; k < res.tracks; k++) {
    if (str(p) !== 'MTrk') throw new Error(`piste ${k} : bloc MTrk absent`);
    const end = p + 8 + r32(p + 4);
    let q = p + 8, tick = 0;
    while (q < end) {
      let d = 0, c;
      do { c = b[q++]; d = (d << 7) | (c & 127); } while (c & 128);
      tick += d;
      res.lastTick = Math.max(res.lastTick, tick);
      const st = b[q];
      if (st === 0xff) { res.meta++; q += 3 + b[q + 2]; continue; }
      const hi = st & 0xf0;
      if (hi === 0x90) res.noteOn++;
      else if (hi === 0x80) res.noteOff++;
      else if (hi === 0xb0) res.cc++;
      else if (hi === 0xe0) res.bend++;
      else throw new Error(`piste ${k} : statut inattendu ${st}`);
      q += 3;
    }
    if (q !== end) throw new Error(`piste ${k} : longueur incohérente`);
    p = end;
  }
  return res;
}

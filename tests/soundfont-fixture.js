/**
 * @file SoundFonts fabriqués pour les tests (tests/soundfont.test.js, tests/headless.test.js) :
 * une sinusoïde et un fichier à la manière de ConvertWithMoss, un preset qui superpose les groupes.
 */

import { writeSoundFont } from '../scripts/soundfont.js';

/** Fréquence d'échantillonnage des échantillons fabriqués. */
export const RATE = 44100;

/**
 * Échantillons : une sinusoïde de 0,5 s (do 4, 261,6 Hz), suivie des 46 zéros exigés.
 * @returns {{smpl: Buffer, shdr: Buffer}}
 */
export function sineSample() {
  const n = RATE / 2;
  const smpl = Buffer.alloc((n + 46) * 2);
  for (let t = 0; t < n; t++) smpl.writeInt16LE(Math.round(16000 * Math.sin((2 * Math.PI * 261.626 * t) / RATE)), t * 2);
  const shdr = Buffer.alloc(46 * 2);
  shdr.write('sine', 0, 'latin1');
  shdr.writeUInt32LE(0, 20); shdr.writeUInt32LE(n, 24); shdr.writeUInt32LE(100, 28); shdr.writeUInt32LE(n - 100, 32);
  shdr.writeUInt32LE(RATE, 36); shdr.writeUInt8(60, 40); shdr.writeUInt16LE(1, 44);
  shdr.write('EOS', 46, 'latin1');
  return { smpl, shdr };
}

/**
 * Zone d'instrument : touches 0 à 127, atténuation (cB) facultative, échantillon 0.
 * @param {number | null} att
 * @returns {{gens: Array<[number, number]>, mods: Array<Buffer>}}
 */
export const zone = (att) => ({ gens: [[43, 0 | (127 << 8)], ...(att === null ? [] : [[48, att & 0xffff]]), [53, 0]], mods: [] });

/**
 * SF2 à la manière de ConvertWithMoss : un preset qui superpose P1, P2, P3, P5 (pas de P4).
 * @param {string} name `ProgA1`...
 * @param {{p1?: number|null, p2?: number, global?: number}} [levels] Atténuations (cB).
 * @returns {Buffer}
 */
export function convertWithMossFile(name, { p1 = 0, p2 = 60, global = 30 } = {}) {
  const { smpl, shdr } = sineSample();
  const instruments = [
    { name: 'P1', zones: [zone(p1)] },
    { name: 'P2', zones: [zone(p2)] },
    { name: 'P3', zones: [{ gens: [[48, global]], mods: [] }, zone(null)] }, // atténuation héritée de la zone globale
    { name: 'P5', zones: [zone(-30)] }, // un gain de +3 dB
  ];
  const presets = [{ name, program: 0, bank: 0, zones: instruments.map((_, i) => ({ gens: [[41, i]], mods: [] })) }];
  return writeSoundFont({ info: new Map([['INAM', Buffer.from(`${name}\0`)]]), smpl, sm24: null, shdr, presets, instruments });
}

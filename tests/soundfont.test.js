/**
 * @file Tests de scripts/soundfont.js : lecture et écriture SF2, fusion des fichiers de
 * ConvertWithMoss (banques, programmes par groupe, groupe manquant, niveaux), et lecture du
 * résultat par le module RustySynth livré dans output/rustysynth/.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readSoundFont, writeSoundFont, mergeGerland, bankOf } from '../scripts/soundfont.js';
import { soundFontGain } from '../output/rustysynth.js';

const RATE = 44100;

/**
 * Échantillons : une sinusoïde de 0,5 s (do 4, 261,6 Hz), suivie des 46 zéros exigés.
 * @returns {{smpl: Buffer, shdr: Buffer}}
 */
function sineSample() {
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
const zone = (att) => ({ gens: [[43, 0 | (127 << 8)], ...(att === null ? [] : [[48, att & 0xffff]]), [53, 0]], mods: [] });

/**
 * SF2 à la manière de ConvertWithMoss : un preset qui superpose P1, P2, P3, P5 (pas de P4).
 * @param {string} name `ProgA1`...
 * @param {{p1?: number|null, p2?: number, global?: number}} [levels] Atténuations (cB).
 * @returns {Buffer}
 */
function convertWithMossFile(name, { p1 = 0, p2 = 60, global = 30 } = {}) {
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

test('readSoundFont relit ce que writeSoundFont écrit', () => {
  const sf = readSoundFont(convertWithMossFile('ProgA1'));
  assert.deepEqual(sf.presets.map((p) => [p.name, p.bank, p.program, p.zones.length]), [['ProgA1', 0, 0, 4]]);
  assert.deepEqual(sf.instruments.map((i) => i.name), ['P1', 'P2', 'P3', 'P5']);
  assert.deepEqual(sf.instruments[2].zones[0].gens, [[48, 30]]);
  assert.equal(sf.smpl.length, (RATE / 2 + 46) * 2);
  const again = writeSoundFont(sf);
  assert.ok(again.equals(writeSoundFont(readSoundFont(again))));
});

test('bankOf : A1 à A16 → 0 à 15, B1 à B16 → 16 à 31', () => {
  assert.equal(bankOf('ProgA1'), 0);
  assert.equal(bankOf('ProgA16'), 15);
  assert.equal(bankOf('ProgB1'), 16);
  assert.equal(bankOf('ProgB16'), 31);
  assert.throws(() => bankOf('ProgC1'));
  assert.throws(() => bankOf('ProgA17'));
});

/**
 * Fusion de trois fichiers : A1 et A2 ont les mêmes niveaux, B1 est 6 dB plus bas sur P1.
 * @returns {ReturnType<typeof mergeGerland>}
 */
const merged = () => mergeGerland([
  { name: 'ProgA1', read: () => convertWithMossFile('ProgA1') },
  { name: 'ProgA2', read: () => convertWithMossFile('ProgA2') },
  { name: 'ProgB1', read: () => convertWithMossFile('ProgB1', { p1: 60 }) },
]);

test('mergeGerland : un preset par instrument du multi (banque) et par groupe (programme)', () => {
  const r = merged();
  assert.equal(r.banks, 3);
  assert.equal(r.levelSets, 2); // A1 et A2 partagent leurs instruments
  assert.deepEqual(r.missing, ['P4', 'P6']);
  const sf = r.soundFont;
  assert.equal(sf.instruments.length, 9); // 2 jeux × 4 groupes, et l'instrument muet
  assert.equal(sf.instruments[sf.presets[3].zones[0].gens[0][1]].name, 'muet');
  assert.deepEqual(sf.presets.map((p) => `${p.bank}:${p.program} ${p.name} ${p.zones.length}`).slice(0, 7), [
    '0:0 A1 P1 1', '0:1 A1 P2 1', '0:2 A1 P3 1', '0:3 A1 P4 1', '0:4 A1 P5 1', '0:5 A1 P6 1', '1:0 A2 P1 1',
  ]);
  assert.equal(sf.presets.at(-6).name, 'B1 P1');
  assert.equal(sf.presets.at(-6).bank, 16);
  // A2 et A1 jouent les mêmes instruments ; B1, ceux du second jeu
  assert.deepEqual(sf.presets[6].zones[0].gens, sf.presets[0].zones[0].gens);
  assert.equal(sf.instruments[sf.presets.at(-6).zones[0].gens[0][1]].name, 'N2 P1');
});

test('mergeGerland : atténuations × 2,5, décalées pour que la plus petite soit nulle, gain noté', () => {
  const r = merged();
  // la plus petite atténuation est −30 cB (P5) : × 2,5 = −75, d'où un décalage de 75 cB et un gain de 3 dB
  assert.equal(r.gainDb, 3);
  const att = (inst) => r.soundFont.instruments.find((i) => i.name === inst).zones.filter((z) => z.gens.some(([op]) => op === 53))
    .map((z) => z.gens.find(([op]) => op === 48)[1]);
  assert.deepEqual(att('N1 P1'), [75]); // 0 → 0 + 75
  assert.deepEqual(att('N1 P2'), [225]); // 60 × 2,5 + 75
  assert.deepEqual(att('N1 P3'), [150]); // 30 hérité de la zone globale, désormais écrit dans la zone
  assert.deepEqual(att('N1 P5'), [0]);
  assert.deepEqual(att('N2 P1'), [225]);
  const p3 = r.soundFont.instruments.find((i) => i.name === 'N1 P3');
  assert.deepEqual(p3.zones[0].gens, []); // plus d'atténuation dans la zone globale
  assert.deepEqual(p3.zones[1].gens.at(-1), [53, 0]); // sampleID reste le dernier générateur
  assert.equal(soundFontGain(writeSoundFont(r.soundFont)), 3);
  assert.equal(soundFontGain(convertWithMossFile('ProgA1')), 0);
});

test('mergeGerland : refuse des fichiers dont les échantillons diffèrent', () => {
  const other = readSoundFont(convertWithMossFile('ProgA2'));
  other.smpl = Buffer.from(other.smpl);
  other.smpl.writeInt16LE(1, 2);
  assert.throws(() => mergeGerland([
    { name: 'ProgA1', read: () => convertWithMossFile('ProgA1') },
    { name: 'ProgA2', read: () => writeSoundFont(other) },
  ]), /échantillons différents/);
});

test('mergeGerland : une variante d’échantillon qui ne diffère que par sa boucle est recalée par les décalages de boucle', () => {
  const other = readSoundFont(convertWithMossFile('ProgB1', { p1: 60 }));
  other.shdr = Buffer.from(other.shdr);
  other.shdr.write('sine_1\0', 0, 'latin1'); // un autre nom : sans effet
  other.shdr.writeUInt32LE(other.shdr.readUInt32LE(28) + 14, 28); // début de boucle +14
  other.shdr.writeUInt32LE(other.shdr.readUInt32LE(32) + 14, 32); // fin de boucle +14
  const r = mergeGerland([
    { name: 'ProgA1', read: () => convertWithMossFile('ProgA1') },
    { name: 'ProgB1', read: () => writeSoundFont(other) },
  ]);
  assert.equal(r.loopFixes, 4); // une zone à échantillon dans chacun des 4 groupes de B1
  const b1p1 = r.soundFont.instruments.find((i) => i.name === 'N2 P1');
  assert.deepEqual(b1p1.zones[0].gens, [[43, 127 << 8], [2, 14], [3, 14], [48, 225], [53, 0]]);
  assert.ok(!r.soundFont.instruments.find((i) => i.name === 'N1 P1').zones[0].gens.some(([op]) => op === 2));
  // une différence de position ou de note de base reste une erreur
  other.shdr.writeUInt8(61, 40);
  assert.throws(() => mergeGerland([
    { name: 'ProgA1', read: () => convertWithMossFile('ProgA1') },
    { name: 'ProgB1', read: () => writeSoundFont(other) },
  ]), /autre chose que la boucle/);
});

/**
 * Charge un SF2 dans le module RustySynth livré, avec une instance.
 * @param {Buffer} sf2
 * @returns {Promise<{midi: (s: number, a: number, b: number) => void, peak: (quanta: number) => number, ex: any}>}
 */
async function rustysynth(sf2) {
  const { instance } = await WebAssembly.instantiate(readFileSync(new URL('../output/rustysynth/rustysynth_wasm.wasm', import.meta.url)), {});
  const ex = instance.exports;
  const ptr = ex.rs_sf2_buffer(sf2.length);
  new Uint8Array(ex.memory.buffer, ptr, sf2.length).set(sf2);
  const presets = ex.rs_load_soundfont();
  const error = () => new TextDecoder().decode(new Uint8Array(ex.memory.buffer, ex.rs_error_ptr(), ex.rs_error_len()));
  assert.ok(presets > 0, `SoundFont refusé par RustySynth : ${presets < 0 ? error() : 'aucun preset'}`);
  assert.equal(ex.rs_init(48000, 1, 32, 16, 0), 0);
  return {
    ex,
    midi: (s, a, b) => ex.rs_midi(0, s, a, b),
    peak(quanta) {
      let p = 0;
      for (let q = 0; q < quanta; q++) {
        const buf = new Float32Array(ex.memory.buffer, ex.rs_render(128), 256);
        for (const v of buf) p = Math.max(p, Math.abs(v));
      }
      return p;
    },
  };
}

test('RustySynth joue le SoundFont fusionné : banque et programme choisis, P4 muet, écarts de niveau rendus', async () => {
  const synth = await rustysynth(writeSoundFont(merged().soundFont));
  /**
   * Crête d'une note (do 4, vélocité 127) dans une banque et un programme.
   * @param {number} bank
   * @param {number} program
   * @returns {number}
   */
  const level = (bank, program) => {
    synth.ex.rs_reset();
    synth.midi(0xb0, 0, bank);
    synth.midi(0xc0, program, 0);
    synth.midi(0x90, 60, 127);
    const p = synth.peak(40);
    synth.midi(0x80, 60, 0);
    synth.ex.rs_note_off_all(1);
    synth.peak(4);
    return p;
  };
  const a1p1 = level(0, 0);
  assert.ok(a1p1 > 0.01, `A1 P1 doit sonner (${a1p1})`);
  assert.equal(level(0, 3), 0, 'P4 (preset vide) doit rester muet');
  const db = (x) => 20 * Math.log10(x / a1p1);
  assert.ok(Math.abs(db(level(0, 1)) + 6) < 0.3, `P2 : −6 dB attendus, ${db(level(0, 1)).toFixed(2)}`);
  assert.ok(Math.abs(db(level(0, 2)) + 3) < 0.3, `P3 : −3 dB attendus, ${db(level(0, 2)).toFixed(2)}`);
  assert.ok(Math.abs(db(level(0, 4)) - 3) < 0.3, `P5 : +3 dB attendus, ${db(level(0, 4)).toFixed(2)}`);
  assert.ok(Math.abs(db(level(16, 0)) + 6) < 0.3, `B1 P1 : −6 dB attendus, ${db(level(16, 0)).toFixed(2)}`);
});

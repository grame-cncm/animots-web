/**
 * @file Tests d'exécution des 36 séquences, des 6 essais et de l'enchaînement des parties.
 *
 * Pour chaque séquence, sur 50 graines : pas d'erreur, toutes les notes commencent avant la
 * fin (elles peuvent la dépasser quand `stac` > 1, comme dans le Lisp), hauteurs et vélocités
 * valides, CC9 conformes au multi que la séquence envoie dans le source. Les exceptions connues
 * du Lisp sont vérifiées pour ce qu'elles sont (séquence 21 : port C ; séquence 1 : silence).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { seed, G, Score, PPQ, sharedGenerators } from '../core/index.js';
import { SEQUENCES, ESSAIS } from '../piece/gerland/sequences/index.js';
import { DUREES, MULTIS, PARTIES_INDICES, SILENCE_ENTRE_PARTIES } from '../piece/gerland/config.js';
import { placeProg, printDialog } from '../piece/gerland/tools.js';
import { gParties, calculPartie, gSequence } from '../piece/gerland/parties.js';
import { decodeLegacy } from '../transpiler/reader.js';
import { toSMF, inspectSMF } from '../output/smf.js';
import { histogram } from './helpers.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SOURCE = decodeLegacy(readFileSync(join(ROOT, 'source/Gerland2013-4.lsp')));

/**
 * Multi envoyé par chaque séquence, relevé dans le source : (place-prog 0 mK *out*).
 * @type {Object<number, string>}
 */
const MULTI_DU_SOURCE = {};
for (const m of SOURCE.matchAll(/\(defun sequence-(\d+)[\s\S]*?\(place-prog 0 (m\d)/g)) MULTI_DU_SOURCE[Number(m[1])] = m[2];

/**
 * Calcule une séquence.
 * @param {Function} fn
 * @param {number} graine
 * @param {number} fin Fin en noires.
 * @returns {Score}
 */
function run(fn, graine, fin) {
  seed(graine);
  sharedGenerators.reset();
  const sc = new Score();
  fn(sc, G(0), G(fin));
  return sc;
}

test('placeProg et printDialog', () => {
  const sc = new Score();
  placeProg(sc, 0, [1, 3]);
  printDialog(sc, 'TEST');
  const cc = sc.events.filter((e) => e.type === 'cc');
  assert.equal(cc.length, 32);
  assert.ok(cc.every((e) => e.ctrl === 9 && e.value === (e.port === 0 ? 1 : 3)));
  assert.equal(sc.label, 'TEST');
});

for (let num = 1; num <= 36; num++) {
  test(`séquence ${num} : 50 graines`, () => {
    const [min, max] = DUREES[num];
    const multi = MULTIS[MULTI_DU_SOURCE[num]];
    for (let graine = 0; graine < 50; graine++) {
      const fin = min + (graine * 37) % (max - min + 1);
      const sc = run(SEQUENCES[num], graine, fin);
      const notes = sc.notes();
      assert.equal(sc.label, `SEQUENCE ${num}`);
      if (num === 1) assert.equal(notes.length, 0);
      else assert.ok(notes.length > 0, `graine ${graine} : aucune note`);
      assert.ok(notes.every((n) => n.tick < fin * PPQ), `graine ${graine} : note commencée après la fin`);
      assert.ok(notes.every((n) => n.pitch >= 0 && n.pitch <= 127 && n.vel > 0 && n.vel <= 127), `graine ${graine} : valeur MIDI`);
      const maxCanal = num === 21 ? 45 : 31;
      assert.ok(notes.every((n) => n.port * 16 + n.chan <= maxCanal), `graine ${graine} : canal hors limites`);
      if (num !== 21) assert.deepEqual(sc.warnings, [], `graine ${graine}`);
      const cc9 = sc.events.filter((e) => e.type === 'cc' && e.ctrl === 9);
      assert.equal(cc9.length, 32);
      assert.ok(cc9.every((e) => e.value === multi[e.port]), `graine ${graine} : CC9`);
    }
  });
}

test('séquence 1 : silence de la durée demandée', () => {
  const sc = run(SEQUENCES[1], 0, 25);
  assert.equal(sc.end, 25 * PPQ);
});

test('séquence 21 : les notes au-delà du canal 31 (port C) sont celles du Lisp, et seulement elles', () => {
  const sc = run(SEQUENCES[21], 4, 200);
  const portC = sc.notes().filter((n) => n.port === 2);
  assert.ok(portC.length > 0);
  assert.equal(sc.warnings.length, portC.length);
  assert.ok(sc.warnings.every((w) => /canal (3[2-9]|4[0-5])\b/.test(w)));
});

test('les 6 essais s’exécutent ; Alterne compare des enceintes voisines', () => {
  for (const [name, fn] of Object.entries(ESSAIS)) {
    seed(1);
    sharedGenerators.reset();
    const sc = new Score();
    fn(sc);
    assert.ok(sc.notes().length > 0, name);
    assert.deepEqual(sc.warnings, [], name);
  }
  const sc = new Score();
  ESSAIS.alterne(sc);
  assert.equal(sc.label, 'ALTERNE');
  assert.ok(sc.notes().every((n) => n.pitch === 7 && n.vel === 127 && n.port === 0));
});

test('g-parties : silence de 25 noires une partie sur deux, et poids des séquences sur 56 tirages', () => {
  seed(2013);
  sharedGenerators.reset();
  const parties = gParties();
  const labels = [];
  for (let k = 0; k < 112; k++) {
    const sc = calculPartie(parties);
    if (k % 2 === 0) {
      assert.equal(sc.label, 'SEQUENCE 1');
      assert.equal(sc.end, SILENCE_ENTRE_PARTIES * PPQ);
    } else labels.push(Number(sc.label.split(' ')[1]));
    assert.deepEqual(sc.warnings.filter((w) => /erreur/.test(w)), []);
  }
  assert.deepEqual(histogram(labels), histogram(PARTIES_INDICES.map((i) => i + 1)));
  assert.equal(labels.includes(17), false);
  assert.equal(labels.includes(22), false);
});

test('calculPartie garde la partition partielle en cas d’erreur (ignore-errors)', () => {
  const casse = G((score) => { score.label = 'X'; score.note(0, 60, 100, 90); throw new Error('panne'); });
  const sc = calculPartie(casse);
  assert.equal(sc.notes().length, 1);
  assert.match(sc.warnings[0], /panne/);
  assert.equal(typeof gSequence(2, 300)(null), 'function');
});

test('export MIDI : toutes les séquences donnent un fichier valide ; port C gardé pour la 21', () => {
  for (let num = 1; num <= 36; num++) {
    const sc = run(SEQUENCES[num], 2013, DUREES[num][0]);
    const info = inspectSMF(toSMF(sc));
    assert.equal(info.noteOn, sc.notes().length, `séquence ${num}`);
    assert.equal(info.noteOff, info.noteOn);
    assert.equal(info.tracks, sc.notes().some((n) => n.port === 2) ? 4 : 3);
  }
});

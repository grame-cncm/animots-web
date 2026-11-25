/**
 * @file Tests des séquences traduites (piece/gerland/sequences.js) : elles s'exécutent sur de
 * nombreuses graines, restent dans leur durée, n'écrivent que sur les canaux prévus, envoient
 * le bon multi, et s'exportent en fichier MIDI valide.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seed, rnd, G, Score, PPQ, sharedGenerators } from '../core/index.js';
import { SEQUENCES, sequence2, sequence3 } from '../piece/gerland/sequences.js';
import { DUREES } from '../piece/gerland/config.js';
import { placeProg, printDialog } from '../piece/gerland/tools.js';
import { toSMF, inspectSMF } from '../output/smf.js';

/**
 * Calcule une séquence avec une graine et une fin données.
 * @param {Function} fn Séquence.
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

test('placeProg : CC9 sur les 16 canaux de chaque port ; printDialog nomme la partition', () => {
  const sc = new Score();
  placeProg(sc, 0, [1, 3]);
  printDialog(sc, 'TEST');
  const cc = sc.events.filter((e) => e.type === 'cc');
  assert.equal(cc.length, 32);
  assert.ok(cc.every((e) => e.ctrl === 9 && e.value === (e.port === 0 ? 1 : 3)));
  assert.equal(sc.label, 'TEST');
});

for (const [num, fn] of Object.entries(SEQUENCES)) {
  test(`séquence ${num} : 200 graines sans erreur, dans la durée, sur le port B, multi M2`, () => {
    const [min, max] = DUREES[num];
    for (let graine = 0; graine < 200; graine++) {
      const fin = min + (graine * 7) % (max - min + 1);
      const sc = run(fn, graine, fin);
      const notes = sc.notes();
      assert.ok(notes.length > 0, `graine ${graine} : aucune note`);
      assert.ok(sc.end <= fin * PPQ, `graine ${graine} : dépasse la fin`);
      assert.ok(notes.every((n) => n.port === 1), `graine ${graine} : note hors du port B`);
      assert.ok(notes.every((n) => n.pitch >= 21 && n.pitch <= 127 && n.vel > 0 && n.vel <= 127));
      assert.deepEqual(sc.warnings, []);
      const cc9 = sc.events.filter((e) => e.type === 'cc' && e.ctrl === 9);
      assert.ok(cc9.every((e) => e.value === (e.port === 0 ? 1 : 3)));
    }
  });
}

test('séquence 2 : fond de nuit tenu sur une enceinte sur deux, oiseaux de 69 à 85', () => {
  const sc = run(sequence2, 5, 400);
  const fond = sc.notes().filter((n) => n.tick === 1 && n.vel === 30);
  assert.deepEqual(fond.map((n) => n.chan), [0, 2, 4, 6, 8, 10, 12, 14]);
  assert.ok(fond.every((n) => n.pitch >= 21 && n.pitch <= 38 && n.dur === 400 * PPQ - 1));
  const oiseaux = sc.notes().filter((n) => n.vel !== 30);
  assert.ok(oiseaux.every((n) => n.pitch >= 69 && n.pitch <= 85 && [70, 80, 90].includes(n.vel)));
  // chaque oiseau sonne sur trois enceintes à la fois, une par zone
  const parDate = new Map();
  for (const n of oiseaux) parDate.set(n.tick, (parDate.get(n.tick) ?? 0) + 1);
  assert.ok([...parDate.values()].every((k) => k % 3 === 0));
});

test('séquence 3 : même graine, même partition ; graine différente, partition différente', () => {
  const a = run(sequence3, 11, 400), b = run(sequence3, 11, 400), c = run(sequence3, 12, 400);
  assert.deepEqual(a.notes(), b.notes());
  assert.notDeepEqual(a.notes(), c.notes());
});

test('séquence 3 : la fin est tirée par rnd comme dans g-parties', () => {
  seed(3);
  sharedGenerators.reset();
  const sc = new Score();
  sequence3(sc, G(0), rnd(...DUREES[3]));
  assert.ok(sc.end <= 600 * PPQ);
});

test('export MIDI des séquences 2 et 3', () => {
  for (const fn of [sequence2, sequence3]) {
    const sc = run(fn, 2013, 300);
    const info = inspectSMF(toSMF(sc));
    assert.equal(info.noteOn, sc.notes().length);
    assert.equal(info.noteOff, info.noteOn);
    assert.equal(info.cc, 32);
  }
});

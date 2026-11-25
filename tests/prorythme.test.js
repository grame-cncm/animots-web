/**
 * @file Tests des processus (core/prorythme.js) : dates, durées, accords, et surtout ordre et
 * nombre d'évaluations des générateurs, relevés dans 4Processus.lisp.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  Score, PPQ, seed, G, s, h, rnd, sel, parseRhythm, gnotes, nGnotes, prorythme, nProrythme, placeTempo,
} from '../core/index.js';
import { spy } from './helpers.js';

/**
 * Notes d'une partition sous forme compacte [tick, super-canal, hauteur, durée, vélocité].
 * @param {Score} sc
 * @returns {Array<Array<number>>}
 */
const compact = (sc) => sc.notes().map((n) => [n.tick, n.port * 16 + n.chan, n.pitch, n.dur, n.vel]);

/**
 * Prépare des générateurs espions qui inscrivent leur nom dans un journal commun.
 * @param {Array<string>} names
 * @param {object} [values] Valeurs rendues par nom (1 par défaut).
 * @returns {{log: Array<string>, g: Object<string, Function>}}
 */
function spies(names, values = {}) {
  const log = [];
  const g = {};
  for (const n of names) g[n] = spy([values[n] ?? 1], log, n);
  return { log, g };
}

describe('prorythme', () => {
  test('exemple de 4Processus.lisp : (prorythme °0 °0 °10 (gnotes) °1/4 °(1/4) (rnd °60 °64) °100)', () => {
    seed(1);
    const sc = new Score();
    prorythme(sc, 0, 0, 10, gnotes(), 1 / 4, [1 / 4], rnd(60, 64), 100);
    const n = compact(sc);
    assert.equal(n.length, 20);
    assert.deepEqual(n[0].slice(0, 2), [1, 0]); // date 0 -> tick 1
    assert.deepEqual(n.slice(1).map((x) => x[0]), Array.from({ length: 19 }, (_, k) => (k + 1) * 2520));
    assert.ok(n.every((x) => x[3] === 1259 && x[4] === 100 && x[2] >= 60 && x[2] <= 64));
  });

  test('le groupe qui dépasse la fin arrête le processus', () => {
    const sc = new Score();
    prorythme(sc, 0, 0, 5, gnotes(), 0, [2], 60, 100);
    assert.deepEqual(compact(sc).map((x) => x[0]), [1, 2 * PPQ]); // un troisième groupe finirait à 6
  });

  test('silences et triolets : dates exactes au tick', () => {
    const sc = new Score();
    prorythme(sc, 0, 0, 1, gnotes(), 0, parseRhythm('(2/3c(1/2 -1/2 1/2))'), 60, 100);
    assert.deepEqual(compact(sc).map((x) => [x[0], x[3]]), [[1, 1679], [3360, 1679]]);
  });

  test('liaisons : notes liées fusionnées, liaison avec un silence coupée', () => {
    const sc = new Score();
    prorythme(sc, 0, 0, 4, gnotes(), 0, [1, '+', 1 / 2, 1, '+', -1 / 2], 60, 100);
    assert.deepEqual(compact(sc).map((x) => [x[0], x[3]]), [[1, 1.5 * PPQ - 1], [1.5 * PPQ, PPQ - 1]]);
  });

  test('début décalé et intervalle', () => {
    const sc = new Score();
    prorythme(sc, 3, 2, 8, gnotes(), 1, [1], 60, 100);
    assert.deepEqual(compact(sc).map((x) => x[0]), [2, 4, 6].map((q) => q * PPQ));
  });

  test('accord multicanal : laccord et lecar tronqués à la plus courte, canaux négatifs ignorés', () => {
    const sc = new Score();
    prorythme(sc, 20, 0, 1, gnotes({ laccord: [0, -16, -30, 5], lecar: [0, 48, 7] }), 0, [1], 30, 80);
    assert.deepEqual(compact(sc).map((x) => [x[1], x[2]]), [[20, 30], [4, 78]]);
  });

  test('stac raccourcit la note sans changer le pas', () => {
    const sc = new Score();
    prorythme(sc, 0, 0, 2, gnotes({ stac: 0.5 }), 0, [1], 60, 100);
    assert.deepEqual(compact(sc).map((x) => [x[0], x[3]]), [[1, 2519], [PPQ, 2519]]);
  });

  test('proba 0 donne un silence', () => {
    const sc = new Score();
    prorythme(sc, 0, 0, 4, gnotes({ proba: s([1, 0]) }), 0, [1], 60, 100);
    assert.deepEqual(compact(sc).map((x) => x[0]), [1, 2 * PPQ]);
  });

  test('ordre par groupe : rythme, puis intervalle, puis éléments', () => {
    const log = [];
    const sc = new Score();
    prorythme(sc, spy([0], log, 'chan'), 0, 1.5, gnotes(), spy([0], log, 'interval'), spy([[1]], log, 'rythme'),
      spy([60], log, 'haut'), spy([90], log, 'vel'));
    assert.deepEqual(log.slice(0, 3), ['rythme', 'interval', 'chan']);
    // second groupe : tiré puis abandonné (il finirait à 2 > 1,5), intervalle quand même évalué
    assert.deepEqual(log.slice(-2), ['rythme', 'interval']);
    assert.equal(log.length, 7);
    // fin atteinte exactement : aucun groupe de plus n'est tiré
    const log2 = [];
    prorythme(new Score(), 0, 0, 1, gnotes(), spy([0], log2, 'interval'), spy([[1]], log2, 'rythme'), 60, 90);
    assert.deepEqual(log2, ['rythme', 'interval']);
  });

  test('gnotes, note : chan, laccord, proba, haut, vel, stac, laccord, lecar', () => {
    const { log, g } = spies(['chan', 'laccord', 'proba', 'haut', 'vel', 'stac', 'lecar'], { laccord: [0], lecar: [0], haut: 60, vel: 90 });
    prorythme(new Score(), g.chan, 0, 1, gnotes({ stac: g.stac, proba: g.proba, laccord: g.laccord, lecar: g.lecar }), 0, [1], g.haut, g.vel);
    assert.deepEqual(log, ['chan', 'laccord', 'proba', 'haut', 'vel', 'stac', 'laccord', 'lecar']);
  });

  test('gnotes, silence du rythme : hauteur et vélocité évaluées quand même', () => {
    const { log, g } = spies(['chan', 'laccord', 'proba', 'haut', 'vel', 'stac', 'lecar'], { laccord: [0], lecar: [0] });
    const sc = new Score();
    prorythme(sc, g.chan, 0, 1, gnotes({ stac: g.stac, proba: g.proba, laccord: g.laccord, lecar: g.lecar }), 0, [-1], g.haut, g.vel);
    assert.deepEqual(log, ['chan', 'laccord', 'proba', 'haut', 'vel', 'stac', 'laccord', 'lecar']);
    assert.equal(sc.notes().length, 0);
  });

  test('gnotes, proba 0 : ni hauteur ni vélocité ; proba −1 : les deux, mais silence', () => {
    for (const [p, expected] of [[0, ['chan', 'laccord', 'proba', 'stac', 'laccord', 'lecar']],
      [-1, ['chan', 'laccord', 'proba', 'haut', 'vel', 'stac', 'laccord', 'lecar']]]) {
      const { log, g } = spies(['chan', 'laccord', 'proba', 'haut', 'vel', 'stac', 'lecar'], { laccord: [0], lecar: [0], proba: p });
      const sc = new Score();
      prorythme(sc, g.chan, 0, 1, gnotes({ stac: g.stac, proba: g.proba, laccord: g.laccord, lecar: g.lecar }), 0, [1], g.haut, g.vel);
      assert.deepEqual(log, expected);
      assert.equal(sc.notes().length, 0);
    }
  });

  test('gnotes : la SECONDE évaluation de laccord donne l’accord (séquence 32)', () => {
    const sc = new Score();
    prorythme(sc, 0, 0, 1, gnotes({ laccord: s([[3], [7]]), lecar: [0] }), 0, [1], 60, 100);
    assert.deepEqual(compact(sc).map((x) => x[1]), [7]);
  });

  test('élément de durée nulle : l’objet reçoit les constantes 20 et 0', () => {
    const haut = spy([60]), vel = spy([90]);
    const sc = new Score();
    prorythme(sc, 0, 0, 1, gnotes(), 0, [0, 1], haut, vel);
    assert.equal(haut.calls, 1);
    assert.equal(sc.notes().length, 1);
  });

  test('ctime des générateurs : date de l’élément', () => {
    const dates = [];
    prorythme(new Score(), 0, 0, 2, gnotes(), 0, [1, 1], (c) => { dates.push(c.ctime); return 60; }, 90);
    assert.deepEqual(dates, [0, PPQ]);
  });

  test('pgchange et paramètres non portés refusés', () => {
    assert.throws(() => prorythme(new Score(), 0, 0, 1, gnotes(), 0, [1], 60, 90, []), /pgchange/);
    assert.throws(() => gnotes({ tril: 1 / 8 }), /:tril n’est pas porté/);
    assert.throws(() => gnotes()(0)(G(0), [1], G(60), G(90), {}), /à l’intérieur de prorythme/);
  });
});

describe('n-prorythme', () => {
  test('exemple de 4Processus.lisp : (n-prorythme °0 °20 (h °(0 1/4)) (n-gnotes °0 °(4) …))', () => {
    seed(2);
    const sc = new Score();
    nProrythme(sc, 0, 20, h([0, 1 / 4]), nGnotes(0, [4], h([72, 67, 66, 73]), 90));
    const n = compact(sc);
    assert.ok(n.length >= 4 && n.length <= 5);
    assert.ok(n.every((x) => x[3] === 4 * PPQ - 1));
    assert.ok(n.at(-1)[0] + 4 * PPQ <= 20 * PPQ + 1);
  });

  test('l’intervalle est évalué avant l’objet ; l’objet qui dépasse saute à la fin', () => {
    const log = [];
    const sc = new Score();
    nProrythme(sc, 0, 5, spy([0], log, 'interval'), (c) => { log.push('objet'); return nGnotes(0, [2], 60, 90)(c); });
    assert.deepEqual(log, ['interval', 'objet', 'interval', 'objet', 'interval', 'objet', 'interval']);
    assert.equal(sc.notes().length, 2);
  });

  test('n-gnotes, note : chan, laccord, lecar, proba, haut, vel, stac', () => {
    const { log, g } = spies(['chan', 'laccord', 'lecar', 'proba', 'haut', 'vel', 'stac'], { laccord: [0], lecar: [0], haut: 60, vel: 90 });
    nProrythme(new Score(), 0, 1, 1, nGnotes(g.chan, [1], g.haut, g.vel, { stac: g.stac, proba: g.proba, laccord: g.laccord, lecar: g.lecar }));
    assert.deepEqual(log, ['chan', 'laccord', 'lecar', 'proba', 'haut', 'vel', 'stac']);
  });

  test('n-gnotes, proba 0 : vélocité évaluée, pas la hauteur', () => {
    const { log, g } = spies(['chan', 'laccord', 'lecar', 'proba', 'haut', 'vel', 'stac'], { laccord: [0], lecar: [0], proba: 0 });
    const sc = new Score();
    nProrythme(sc, 0, 1, 1, nGnotes(g.chan, [1], g.haut, g.vel, { stac: g.stac, proba: g.proba, laccord: g.laccord, lecar: g.lecar }));
    assert.deepEqual(log, ['chan', 'laccord', 'lecar', 'proba', 'vel', 'stac']);
    assert.equal(sc.notes().length, 0);
  });

  test('choix d’objet par sel, accord avec écart négatif (séquence 10)', () => {
    const sc = new Score();
    const voix = nGnotes(20, [1], 30, 80, { laccord: [0, -16], lecar: [0, 48] });
    const oiseau = nGnotes(21, [1], 100, 80);
    nProrythme(sc, 0, 2, 0, sel(s([0, 1]), voix, oiseau));
    assert.deepEqual(compact(sc).map((x) => [x[1], x[2]]), [[20, 30], [4, 78], [21, 100]]);
  });
});

test('placeTempo écrit le tempo à la date en noires', () => {
  const sc = new Score();
  placeTempo(sc, 2, 90);
  assert.deepEqual(sc.events[0], { type: 'tempo', tick: 2 * PPQ, bpm: 90 });
});

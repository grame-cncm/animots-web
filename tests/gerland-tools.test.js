/**
 * @file Tests des outils et données de Gerland (piece/gerland/tools.js, config.js).
 * Les exemples viennent des commentaires de Gerland2013-4.lsp.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seed, L, s, h, hs, rnd, alt, floo, i, ctx, durMidi } from '../core/index.js';
import {
  xconcat, selAl, traj, groupe, nconcatSpe4, listNvaleur, glist, glistedate, glistedur, dateDur, transfDat, once,
} from '../piece/gerland/tools.js';
import {
  MULTIS, TEMPO, GACCORD, GACCORD_DEMI, GECAR, ZONE1, ZONE2, ZONE3, TRAJ_TOTAL_DIRECT, TRAJ_TOTAL_INDIRECT,
  TRAJ_TOTAL_DIRECT2, TRAJ_TOTAL_INDIRECT2, TRAJ_ZIG_ZAG, TRAJ_ZIG_ZAG2, trajectoires, listgroupe,
  PARTIES_INDICES, DUREES, SILENCE_ENTRE_PARTIES,
} from '../piece/gerland/config.js';
import { c0, draw, histogram, spy } from './helpers.js';

test('xconcat tire le rythme une fois, avant n, et le répète', () => {
  seed(30);
  const v = L(300, xconcat(3, selAl(4, [1 / 2], [1], [3 / 2], [3], [5])));
  assert.ok(v.every((r) => r.length === 3 && new Set(r).size === 1));
  const log = [];
  xconcat(spy([2], log, 'n'), spy([[1]], log, 'rytm'))(c0);
  assert.deepEqual(log, ['rytm', 'n']);
});

test('selAl (Gerland) borne l’indice au lieu de déborder', () => {
  seed(31);
  const N = 40000;
  const v = draw(selAl(4, 'a', 'b', 'c', 'd'), N); // random(5) borné à 3 : d a 2/5
  const hst = histogram(v);
  assert.ok(Math.abs(hst.get('d') / N - 2 / 5) < 0.01);
  assert.ok(Math.abs(hst.get('a') / N - 1 / 5) < 0.01);
  // cas courant : g1 + 1 = nombre d'alternatives, tirage uniforme
  const u = histogram(draw(selAl(3, 1, 2, 3, 4), N));
  for (const [, n] of u) assert.ok(Math.abs(n - N / 4) < 0.05 * N / 4);
  assert.throws(() => selAl(-1, 'a')(c0), RangeError); // (random 0)
});

test('selAl (Gerland) avec floo(i(6, 0)) : le choix se resserre au fil du temps', () => {
  seed(32);
  const g = selAl(floo(i(6, 0)), 0, 1, 2, 3, 4, 5, 6);
  const fin = Array.from({ length: 200 }, () => g(ctx(0, 99, 100)));
  assert.ok(fin.every((x) => x === 0)); // à la fin, (floo (i °6 °0)) vaut 0 : (random 1) = 0
  const debut = Array.from({ length: 2000 }, () => g(ctx(0, 0, 100)));
  assert.equal(new Set(debut).size, 7);
});

test('traj parcourt un chemin en boucle ; gnum est évalué avant gtraj', () => {
  assert.deepEqual(traj([0, 1, 2], 5)(c0), [0, 1, 2, 0, 1]);
  seed(33);
  const v = traj(trajectoires(), 12)(c0);
  assert.equal(v.length, 12);
  assert.ok(v.every((x) => x >= 0 && x <= 15));
  const log = [];
  traj(spy([[1]], log, 'gtraj'), spy([2], log, 'gnum'))(c0);
  assert.deepEqual(log, ['gnum', 'gtraj']);
});

test('groupe : enceintes d’un seul groupe, chacune répétée', () => {
  seed(34);
  for (let k = 0; k < 50; k++) {
    const v = groupe(listgroupe(), 6, 2)(c0);
    assert.equal(v.length, 6);
    assert.equal(v[0], v[1]);
    const groups = [[16, 17, 18, 19], [20, 21, 25, 24], [20, 21, 22, 23, 27, 26, 25, 24], [22, 23, 27, 26], [28, 29, 30, 31]];
    assert.ok(groups.some((g) => v.every((x) => g.includes(x))));
  }
});

test('nconcatSpe4 et listNvaleur (exemples Lisp)', () => {
  seed(35);
  const v = nconcatSpe4(8, hs([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]))(c0);
  assert.equal(new Set(v).size, 8);
  const w = listNvaleur(8, hs([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]))(c0);
  assert.equal(new Set(w).size, 8);
  // list-nvaleur appelle v avec (0 i n nil), pas avec le contexte de l'appelant
  assert.deepEqual(listNvaleur(4, i(0, 4))(ctx(100, 150, 200)), [0, 1, 2, 3]);
});

test('glist replie dans [min, max] (exemple Lisp)', () => {
  seed(36);
  const v = glist(3, rnd(10, 20), 30, 40)(c0);
  assert.equal(v.length, 3);
  assert.ok(v.every((x) => x >= 30 && x <= 40));
});

test('glistedate et glistedur (exemples Lisp)', () => {
  assert.deepEqual(glistedate(0, 10, alt(1, 3))(c0), [0, 1, 4, 5, 8, 9]);
  assert.deepEqual(glistedur(0, 10, alt(1, 3))(c0), [1, 3, 1, 3, 1, 3]);
});

test('dateDur (exemple Lisp)', () => {
  assert.deepEqual(dateDur([0, 2, 6, 12, 20, 22, 26]), [2, 4, 6, 8, 2, 4]);
});

test('transfDat : décalages tirés en partant de la dernière date', () => {
  assert.deepEqual(transfDat([0, 2, 6], s([10, 20, 30]))(c0), [30, 22, 16]);
  seed(37);
  const v = transfDat([0, 2, 6, 12, 20, 22, 26], h([-0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3]))(c0);
  v.forEach((x, k) => assert.ok(Math.abs(x - [0, 2, 6, 12, 20, 22, 26][k]) <= 0.3 + 1e-12));
});

test('once fige une valeur', () => {
  const g = once(s([4, 5]));
  assert.deepEqual([g(c0), g(c0)], [4, 4]);
});

test('config : multis, listes et pondérations conformes au fichier', () => {
  assert.deepEqual(MULTIS.m2, [1, 3]);
  assert.deepEqual(MULTIS.m9, [6, 6]);
  assert.equal(Object.keys(MULTIS).length, 9);
  assert.equal(TEMPO, 60);
  assert.equal(GACCORD.length, 16);
  assert.equal(GACCORD_DEMI.length, 8);
  assert.ok(GECAR.every((x) => x === 0) && GECAR.length === 16);
  assert.deepEqual([...ZONE1, ...ZONE2, ...ZONE3].sort((a, b) => a - b), GACCORD);
  for (const tr of [TRAJ_TOTAL_DIRECT, TRAJ_TOTAL_INDIRECT]) assert.deepEqual([...tr].sort((a, b) => a - b), GACCORD);
  for (const tr of [TRAJ_TOTAL_DIRECT2, TRAJ_TOTAL_INDIRECT2]) assert.deepEqual([...tr].sort((a, b) => a - b), GACCORD.map((x) => x + 16));
  assert.ok(TRAJ_ZIG_ZAG.every((x) => x < 16) && TRAJ_ZIG_ZAG2.every((x) => x >= 16));
  assert.equal(PARTIES_INDICES.length, 56);
  const w = histogram(PARTIES_INDICES);
  assert.equal(w.get(16), undefined); // séquence 17 retirée
  assert.equal(w.get(21), undefined); // séquence 22 retirée
  assert.equal(w.get(0), 2);
  assert.equal(w.get(9), 1);
  assert.equal(Object.keys(DUREES).length, 36);
  assert.deepEqual(DUREES[2], [300, 600]);
  assert.equal(SILENCE_ENTRE_PARTIES, 25);
});

test('trajectoires et listgroupe : un nouveau générateur à chaque appel, valeurs valides', () => {
  seed(38);
  assert.notEqual(trajectoires(), trajectoires());
  const seen = new Set();
  for (let k = 0; k < 2000; k++) seen.add(JSON.stringify(trajectoires()(c0)));
  assert.equal(seen.size, 13);
  const groups = new Set();
  for (let k = 0; k < 500; k++) groups.add(JSON.stringify(listgroupe()(c0)));
  assert.equal(groups.size, 5);
});

test('durées tirées dans les rythmes de Gerland : sel-al de rythmes simples', () => {
  seed(39);
  const v = draw(selAl(4, [1 / 2], [1], [3 / 2], [3], [5]), 1000).map(durMidi);
  assert.deepEqual([...new Set(v)].sort((a, b) => a - b), [0.5, 1, 1.5, 3, 5]);
});

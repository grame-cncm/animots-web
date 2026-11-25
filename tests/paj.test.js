/**
 * @file Tests des générateurs PAJ (core/paj.js) : sel-al de la bibliothèque et flux partagés.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seed, L, s, h, selAl, SharedGenerators, shareGen, useGen, freeGen, sharedGenerators, lst } from '../core/index.js';
import { c0, draw, histogram, spy } from './helpers.js';

test('selAl (bibliothèque) : tirage uniforme quand g1 + 1 = nombre d’alternatives', () => {
  seed(11);
  const N = 30000;
  const v = draw(selAl(2, 'a', 'b', 'c'), N);
  for (const [, n] of histogram(v)) assert.ok(Math.abs(n - N / 3) < 0.05 * N / 3);
});

test('selAl (bibliothèque) déborde comme en 2013 (« index 4 out of range »)', () => {
  seed(12);
  const g = selAl(4, 'a', 'b', 'c', 'd'); // 4 alternatives, indice tiré dans 0..4
  assert.throws(() => draw(g, 200), /The index 4 is out of range/);
});

test('use-gen : chaque lecteur lit la même suite, le générateur n’est évalué qu’une fois par valeur', () => {
  const reg = new SharedGenerators();
  const gen = spy([10, 20, 30, 40]);
  reg.share('n1', gen);
  const r1 = reg.use('n1'), r2 = reg.use('n1');
  assert.deepEqual([r1(c0), r1(c0), r1(c0)], [10, 20, 30]);
  assert.deepEqual([r2(c0), r2(c0)], [10, 20]);
  assert.equal(gen.calls, 3);
  assert.equal(r2(c0), 30);
  assert.equal(r2(c0), 40);
  assert.equal(gen.calls, 4);
});

test('use-gen : exemple Lisp (l 50 (alt (use-gen x) (freq °2 (use-gen x)) (use-gen x)))', () => {
  const reg = new SharedGenerators();
  reg.share('x', s([1, 2, 3, 4, 5, 6]));
  const a = reg.use('x'), b = reg.use('x');
  // a et b lus alternativement : ils restent alignés sur les mêmes valeurs
  assert.deepEqual(L(6, (c) => [a(c), b(c)]), [[1, 1], [2, 2], [3, 3], [4, 4], [5, 5], [6, 6]]);
});

test('free-gen vide les valeurs mais garde le générateur ; un ancien lecteur est alors en erreur', () => {
  const reg = new SharedGenerators();
  reg.share('n', s([1, 2, 3]));
  const r = reg.use('n');
  assert.deepEqual([r(c0), r(c0)], [1, 2]);
  reg.free('n');
  const r2 = reg.use('n');
  assert.equal(r2(c0), 3); // même générateur, qui continue sa liste
  assert.throws(() => r(c0), /reader used after free-gen/);
});

test('share-gen ne vide pas les valeurs déjà produites (comportement Lisp)', () => {
  const reg = new SharedGenerators();
  reg.share('n', s([1, 2]));
  reg.use('n')(c0);
  reg.share('n', s([7, 8]));
  const r = reg.use('n');
  assert.deepEqual([r(c0), r(c0)], [1, 7]);
});

test('use-gen sans share-gen est une erreur à l’appel', () => {
  const reg = new SharedGenerators();
  assert.throws(() => reg.use('inconnu')(c0), TypeError);
});

test('registre global : shareGen, useGen, freeGen, reset', () => {
  sharedGenerators.reset();
  seed(13);
  shareGen('n1', h([1, 2, 3]));
  const g = lst(useGen('n1'), useGen('n1'));
  const [a, b] = g(c0);
  assert.equal(a, b);
  freeGen('n1');
  sharedGenerators.reset();
  assert.throws(() => useGen('n1')(c0), TypeError);
});

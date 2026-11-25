/**
 * @file Tests de la sémantique Common Lisp (core/lisp.js).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NIL, isNil, clRound, clMod, elt, clEqual, plus, minus, times, divide, clReduce } from '../core/lisp.js';

test('isNil : seuls null, undefined, false et la liste vide sont NIL', () => {
  for (const v of [null, undefined, false, []]) assert.equal(isNil(v), true);
  for (const v of [0, '', [0], true, 1]) assert.equal(isNil(v), false);
  assert.equal(NIL, null);
});

test('clRound arrondit au pair en cas d’égalité', () => {
  assert.deepEqual([0.5, 1.5, 2.5, 3.5, -0.5, -1.5, -2.5].map(clRound), [0, 2, 2, 4, 0, -2, -2]);
  assert.deepEqual([2.4, 2.6, -2.6].map(clRound), [2, 3, -3]);
});

test('clMod prend le signe du diviseur', () => {
  assert.equal(clMod(-1, 16), 15);
  assert.equal(clMod(17, 16), 1);
  assert.equal(clMod(5, -3), -1);
  assert.equal(clMod(0, 5), 0);
  assert.throws(() => clMod(1, 0), RangeError);
});

test('elt signale une erreur hors de la séquence', () => {
  assert.equal(elt([1, 2, 3], 2), 3);
  assert.throws(() => elt([1, 2, 3, 4], 4), /The index 4 is out of range/);
  assert.throws(() => elt([1, 2], -1), RangeError);
  assert.throws(() => elt([1, 2], 0.5), RangeError);
});

test('clEqual compare les listes structurellement', () => {
  assert.equal(clEqual([1, [2, 3]], [1, [2, 3]]), true);
  assert.equal(clEqual([1, 2], [1, 2, 3]), false);
  assert.equal(clEqual(null, []), true);
  assert.equal(clEqual(1, 1), true);
});

test('opérateurs variadiques comme en Lisp', () => {
  assert.equal(plus(), 0);
  assert.equal(times(), 1);
  assert.equal(minus(5), -5);
  assert.equal(minus(10, 2, 3), 5);
  assert.equal(divide(4), 0.25);
  assert.equal(divide(12, 2, 3), 2);
  assert.throws(() => divide(1, 0), /Division by zero/);
  assert.throws(() => minus(), TypeError);
});

test('clReduce de gauche et de droite (exemples rdg et rdd du Lisp)', () => {
  assert.equal(clReduce(minus, [10, 2, 3, 4, 5]), -4);
  assert.equal(clReduce(minus, [10, 2, 3, 4, 5], true), 12);
  assert.equal(clReduce(plus, [7]), 7);
  assert.equal(clReduce(plus, []), 0);
});

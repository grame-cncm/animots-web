/**
 * @file Tests de l'aléa reproductible (core/random.js).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seed, random, getRandomState, setRandomState } from '../core/random.js';
import { histogram } from './helpers.js';

test('une même graine donne les mêmes tirages', () => {
  seed(42);
  const a = Array.from({ length: 20 }, () => random(1000));
  seed(42);
  const b = Array.from({ length: 20 }, () => random(1000));
  assert.deepEqual(a, b);
});

test('getRandomState / setRandomState rejouent la suite', () => {
  seed(7);
  random(10);
  const st = getRandomState();
  const a = [random(100), random(100)];
  setRandomState(st);
  assert.deepEqual([random(100), random(100)], a);
});

test('random(n) entier : uniforme dans [0, n)', () => {
  seed(1);
  const n = 6, N = 60000;
  const values = Array.from({ length: N }, () => random(n));
  assert.ok(values.every((v) => Number.isInteger(v) && v >= 0 && v < n));
  for (const [, count] of histogram(values)) assert.ok(Math.abs(count - N / n) < 0.05 * N / n);
});

test('random(x) flottant : dans [0, x)', () => {
  seed(2);
  const values = Array.from({ length: 1000 }, () => random(2.5));
  assert.ok(values.every((v) => v >= 0 && v < 2.5));
  assert.ok(values.some((v) => !Number.isInteger(v)));
});

test('random(0) et random(-1) sont des erreurs, comme en Lisp', () => {
  assert.throws(() => random(0), RangeError);
  assert.throws(() => random(-1), RangeError);
});

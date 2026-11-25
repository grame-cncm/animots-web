/**
 * @file Tests des rythmes symboliques (core/rhythm.js).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PPQ, ticks, TUPLETS, t, parseRhythm, codeRhythm, prefixPlus, elements, elementDuration, durMidi,
  longRythme, toRest, isRest, segments, concat, nconcat, nconcatSpe, nconcatSpe2, nconcatSpe3, concatList,
  seed, h, s, lst, L,
} from '../core/index.js';
import { c0 } from './helpers.js';

/**
 * Compare deux nombres à 1e-12 près.
 * @param {number} a
 * @param {number} b
 */
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-12, `${a} != ${b}`);

test('ticks : conversion exacte malgré les flottants', () => {
  assert.equal(PPQ, 5040);
  assert.equal(ticks(1), 5040);
  assert.equal(ticks(1 / 3), 1680);
  assert.equal(ticks(2 / 3 * 1 / 2), 1680);
  assert.equal(ticks((2 / 3) * (2 / 3) * (1 / 4)), 560);
  assert.equal(ticks(-1 / 2), 2520);
  assert.equal(ticks(1 / 16), 315);
  assert.equal(ticks(12.3), 61992); // (floor (* 5040 12.3))
  // somme de trois tiers : la date de fin tombe juste
  assert.equal(ticks(1 / 3) * 3, ticks(1));
});

test('t et la table des n-olets', () => {
  assert.equal(Object.keys(TUPLETS).length, 23);
  assert.deepEqual(t('2/3C', [1]), { tuplet: '2/3c', ratio: 2 / 3, items: [1] });
  assert.throws(() => t('2/5c', [1]), /undefined symbolic duration/);
  assert.throws(() => t('2/3c', 1), /must be followed by a list/);
});

test('parseRhythm lit la notation Lisp, avec ou sans espace', () => {
  assert.deepEqual(parseRhythm('(1/2 1 3/2 3 5)'), [0.5, 1, 1.5, 3, 5]);
  assert.deepEqual(parseRhythm('(2/3c(1/2 1/2 1/2))'), [t('2/3c', [0.5, 0.5, 0.5])]);
  assert.deepEqual(parseRhythm('(2/3n (1 -1 1))'), [t('2/3n', [1, -1, 1])]);
  assert.deepEqual(parseRhythm('(1 + 1/2 -0.25)'), [1, '+', 0.5, -0.25]);
  assert.throws(() => parseRhythm('(1 2'), /unbalanced/);
  assert.throws(() => parseRhythm('1 2'), /a rythm is a list/);
  assert.throws(() => parseRhythm('((1 2))'), /a list must follow a tuplet symbol/);
  assert.throws(() => parseRhythm('(ttrio2 (1))'), /undefined symbolic duration/);
});

test('codeRhythm et prefixPlus : exemple de 4Processus.lisp', () => {
  // (prefixplus (code-rythme '(1 + 2/3c (1/2 2/3dc (-1/2 1/4) + 1/2) -2 4)))
  // --> ((+ 1 (* 2/3 1/2)) (* 2/3 2/3 -1/2) (+ (* 2/3 2/3 1/4) (* 2/3 1/2)) -2 4)
  const r = parseRhythm('(1 + 2/3c (1/2 2/3dc (-1/2 1/4) + 1/2) -2 4)');
  const el = elements(r);
  assert.equal(el.length, 5);
  near(el[0][0], 1); near(el[0][1], 1 / 3);
  near(el[1][0], -2 / 9);
  near(el[2][0], 1 / 9); near(el[2][1], 1 / 3);
  assert.deepEqual(el.slice(3), [[-2], [4]]);
  // (dur-midi ...) --> 8
  near(durMidi(r), 8);
  assert.equal(longRythme(r), 5);
});

test('triolets de Gerland : une noire au total', () => {
  for (const txt of ['(2/3c(1/2 1/2 1/2))', '(2/3dc(1/4 1/4 1/4))', '(2/3c(1/4 1/4 1/4))']) {
    const r = parseRhythm(txt);
    assert.equal(elements(r).length, 3);
  }
  near(durMidi(parseRhythm('(2/3c(1/2 1/2 1/2))')), 1);
  near(durMidi(parseRhythm('(2/3n (1 -1 1))')), 2);
  near(durMidi(parseRhythm('(2/3n (2 1))')), 2);
});

test('long-rythme : exemples de 6Enigma.lisp', () => {
  assert.equal(longRythme([1, 2, 3]), 3);
  assert.equal(longRythme([1, '+', 2, '+', 3]), 1);
  assert.equal(longRythme(parseRhythm('(1 + 2/3b (2 -2 2) + 10 20)')), 4);
});

test('prefixPlus refuse un + mal placé', () => {
  assert.throws(() => prefixPlus(['+', 1]), /misplaced/);
  assert.throws(() => prefixPlus([1, '+']), /must be followed/);
  assert.throws(() => codeRhythm([[1]]), /wrong rythm/);
});

test('elementDuration, toRest, isRest, segments', () => {
  assert.equal(elementDuration([1, -0.5]), 1.5);
  assert.deepEqual(toRest([1, -0.5]), [-1, -0.5]);
  assert.equal(isRest([-1]), true);
  assert.equal(isRest([1, -0.5]), false);
  assert.deepEqual(segments([2]), [2]);
  assert.deepEqual(segments([1, 0.5]), [1.5]);
  assert.deepEqual(segments([1, -0.5]), [1, -0.5]);
  assert.deepEqual(segments([-1, 0.5]), [-1, 0.5]);
  assert.deepEqual(segments([1, 0.5, 0.25]), [1.75]);
});

test('concat et concatList (exemple Lisp)', () => {
  assert.deepEqual(concat([1 / 2], [1 / 8, 1 / 8], [4])(c0), [0.5, 0.125, 0.125, 4]);
  assert.deepEqual(concatList(lst([1, 2, 3], [10, 20]))(c0), [1, 2, 3, 10, 20]);
});

test('nconcat tire n fois, nconcatSpe une seule fois', () => {
  seed(20);
  const draws = L(200, nconcat(3, h([[1], [1 / 2], [1 / 4]])));
  assert.ok(draws.some((r) => new Set(r).size > 1));
  const spe = L(200, nconcatSpe(3, h([[1], [1 / 2], [1 / 4]])));
  assert.ok(spe.every((r) => r.length === 3 && new Set(r).size === 1));
  assert.deepEqual(nconcat(2, s([[1], [2]]))(c0), [1, 2]);
});

test('nconcatSpe2 complète jusqu’à la noire entière (exemple Lisp)', () => {
  assert.deepEqual(nconcatSpe2(9, [1 / 4])(c0), [...new Array(9).fill(0.25), 0.75]);
  assert.deepEqual(nconcatSpe2(4, [1 / 4])(c0), new Array(4).fill(0.25));
});

test('nconcatSpe3 remplit la durée de r1 avec r2', () => {
  assert.deepEqual(nconcatSpe3([3], [1, 1 / 2])(c0), [1, 0.5, 1, 0.5]);
  assert.deepEqual(nconcatSpe3([2], [3 / 4])(c0), [0.75, 0.75, 0.5]);
});

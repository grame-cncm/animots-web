/**
 * @file Phase 4 : le portage comparé au code Lisp d'origine exécuté dans SBCL.
 *
 * Les tests de normalisation et d'appariement tournent partout. La comparaison elle-même ne
 * tourne que si `sbcl` est installé ; sinon elle est signalée comme sautée. La comparaison
 * complète, sur plus de graines, se lance avec `npm run check:lisp`.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { Score } from '../core/index.js';
import {
  normalizeLisp, normalizeJs, diffEvents, tolerantMatch, compare, cases, finFor, FLOAT_SENSITIVE,
} from '../validation/compare.js';

const HAS_SBCL = !spawnSync('sbcl', ['--version'], { encoding: 'utf8' }).error;

test('normalizeLisp : notes, key-on/key-off réunis, vélocité 0 écartée, tempo en BPM', () => {
  const { events, bends } = normalizeLisp([
    ['note', 10, 60, 99, 90, 2, 1], ['note', 20, 61, 99, 0, 2, 1],
    ['on', 1, 30, 30, 0, 1], ['off', 1512000, 30, 30, 0, 1],
    ['cc', 0, 9, 3, 4, 1], ['tempo', 0, 1000000], ['bend', 0, 0, 0, 1], ['bend', 5, 585, 0, 1],
  ]);
  assert.deepEqual(events.map((e) => e.key), [
    'note 10 1:2 p60 d99 v90', 'note 1 1:0 p30 d1511999 v30', 'cc 0 1:4 9=3', 'tempo 0 60',
  ]);
  assert.equal(bends, 1);
});

test('normalizeJs et diffEvents', () => {
  const sc = new Score();
  sc.tempo(0, 60);
  sc.pAbs(10); sc.note(18, 60, 100, 90);
  const js = normalizeJs(sc).events;
  assert.deepEqual(js.map((e) => e.key), ['tempo 0 60', 'note 10 1:2 p60 d99 v90']);
  const d = diffEvents([{ key: 'note 10 1:2 p60 d99 v90', tick: 10 }, { key: 'cc 0 0:0 9=1', tick: 0 }], js);
  assert.deepEqual([d.equal, d.onlyLisp, d.onlyJs], [false, ['cc 0 0:0 9=1'], ['tempo 0 60']]);
});

test('tolerantMatch : décalage léger accepté et mesuré, hauteur différente refusée', () => {
  const m = tolerantMatch(['note 100 0:1 p60 d50 v90', 'note 300 0:1 p76 d50 v70'], ['note 103 0:1 p60 d51 v90', 'note 300 0:1 p71 d50 v70']);
  assert.deepEqual([m.matched, m.maxShift, m.onlyLisp, m.onlyJs], [1, 3, ['note 300 0:1 p76 d50 v70'], ['note 300 0:1 p71 d50 v70']]);
});

test('cas à comparer et fins tirées', () => {
  const c = cases({ seeds: 2, only: [], parties: 4 });
  assert.equal(c.length, 2 * (36 + 6 + 1));
  assert.ok(c.includes(`seq:10:2:${finFor(10, 2)}`) && c.includes('essai:test4:1') && c.includes('parties:2:4'));
  assert.deepEqual(cases({ seeds: 1, only: [2, 3], parties: 4 }), [`seq:2:1:${finFor(2, 1)}`, `seq:3:1:${finFor(3, 1)}`]);
  assert.ok(FLOAT_SENSITIVE['SEQUENCE 29']);
});

test('Lisp d’origine (SBCL) et JavaScript : mêmes partitions, 2 graines', { skip: HAS_SBCL ? false : 'sbcl absent' }, () => {
  const { results, nonIntegerDates } = compare(cases({ seeds: 2, only: [], parties: 6 }));
  const bad = results.filter((r) => !r.equal);
  assert.deepEqual(bad.map((r) => `${r.spec} : ${r.problems.join(' / ')}`), []);
  assert.equal(nonIntegerDates, 0);
  // hors séquence 29 (flottants), aucune note n'a dû être appariée avec tolérance
  assert.ok(results.filter((r) => !r.spec.startsWith('seq:29:') && !r.spec.startsWith('parties:')).every((r) => r.shifted === 0 && r.floatResidue === 0));
});

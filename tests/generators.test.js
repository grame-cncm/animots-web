/**
 * @file Tests des générateurs temporels (core/generators.js).
 *
 * Trois sortes de vérifications :
 * - les exemples donnés en commentaire dans les sources Lisp, reproduits à l'identique ;
 * - des propriétés (bornes, lois de probabilité, épuisement) pour les générateurs aléatoires ;
 * - l'ordre et le nombre d'évaluations des arguments, qui conditionnent la fidélité.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  seed, ctx, G, lift, L, take, lst, appl, call, proba, alea, constraint, replie, sisyphe, tore,
  sync, stime, ctime, etime, isreverse, boucle, i, ntime, rev, trep, seq, s, borne, ecrete, h, hs,
  combinaisons, cb, nonil, rnd, sel, selr, alt, ralt, lalt, rdg, rdd, rdv, dif, pf, freeze, pl, blk,
  rep, mem, add, sub, mult, div, floo, frag, shift, freq, mini, maxi, gor, gand, gnot, ggnot, gmod,
  gate, gpgate, pulse, gbrown, gbrown2, greplie, sinus, osc, gosc, gosc2, pblk, perm,
  plus, minus, NIL, T,
} from '../core/index.js';
import { c0, draw, histogram, spy } from './helpers.js';

describe('bases', () => {
  test('G et lift', () => {
    assert.equal(G(5)(c0), 5);
    const f = () => 9;
    assert.equal(lift(f), f);
    assert.deepEqual(lift([1, 2])(c0), [1, 2]);
  });

  test('ctx', () => assert.deepEqual(ctx(1, 2, 3), { stime: 1, ctime: 2, etime: 3, reverse: false }));

  test('L appelle avec (0 i n nil) : l’indice sert de date courante', () => {
    assert.deepEqual(L(4, i(0, 4)), [0, 1, 2, 3]);
    assert.deepEqual(L(3, (c) => [c.stime, c.ctime, c.etime, c.reverse]), [[0, 0, 3, false], [0, 1, 3, false], [0, 2, 3, false]]);
  });

  test('take rend la n-ième valeur', () => assert.equal(take(3, s([5, 6, 7, 8])), 7));

  test('lst, appl, call', () => {
    assert.deepEqual(lst(1, G(2), [3])(c0), [1, 2, [3]]);
    assert.equal(appl(G(Math.max), [3, 8, 2])(c0), 8);
    assert.equal(call(G(minus), 10, 4)(c0), 6);
  });

  test('lst évalue de gauche à droite', () => {
    const log = [];
    lst(spy([1], log, 'a'), spy([2], log, 'b'), spy([3], log, 'c'))(c0);
    assert.deepEqual(log, ['a', 'b', 'c']);
  });
});

describe('fonctions sur les nombres', () => {
  test('tore (exemple Lisp : (tore 6 0 5) --> 1)', () => {
    assert.equal(tore(6, 0, 5), 1);
    assert.equal(tore(3, 0, 5), 3);
    assert.equal(tore(-1, 0, 5), 4); // enroulement, pas réflexion : (- 5 (- 10 9))
    assert.equal(tore(5, 0, 5), 5);
    assert.equal(tore(11, 0, 5), 1);
    assert.equal(tore(7, 4, 4), 4);
  });

  test('replie, constraint, sisyphe', () => {
    assert.equal(replie(12, 0, 10), 8);
    assert.equal(replie(-3, 0, 10), 3);
    assert.equal(replie(25, 0, 10), 5);
    assert.equal(replie(2.5, 0, 10), 2); // arrondi au pair
    assert.equal(constraint(-4, 0, 10), 0);
    assert.equal(constraint(14, 0, 10), 10);
    assert.equal(constraint(3.5, 0, 10), 4);
    assert.equal(sisyphe(25, 0, 10, 12), 1);
    assert.equal(sisyphe(-5, 0, 10, 3), 1);
  });

  test('proba et alea', () => {
    seed(3);
    const n = 20000;
    const yes = Array.from({ length: n }, () => proba(0.25)).filter(Boolean).length;
    assert.ok(Math.abs(yes / n - 0.25) < 0.02);
    assert.equal(alea(10, 0), 10);
    const a = Array.from({ length: 2000 }, () => alea(10, 2));
    assert.deepEqual([...new Set(a)].sort((x, y) => x - y), [8, 9, 10, 11, 12]);
  });
});

describe('générateurs temporels', () => {
  test('stime, ctime, etime, isreverse, sync', () => {
    const c = ctx(1, 2, 3, true);
    assert.deepEqual([stime()(c), ctime()(c), etime()(c), isreverse()(c)], [1, 2, 3, true]);
    assert.equal(sync(0, 5, 10, false, i(0, 100))(c0), 50);
  });

  test('i interpole et respecte reverse', () => {
    assert.deepEqual(L(5, i(0, 10)), [0, 2, 4, 6, 8]);
    assert.equal(i(0, 10)(ctx(0, 1, 4, true)), 7.5);
    assert.equal(i(3, 9)(ctx(5, 5, 5)), 3); // etime = stime : valeur de départ
    assert.deepEqual(L(5, rev(i(0, 10))), [10, 8, 6, 4, 2]);
    assert.deepEqual(L(4, ntime()), [0, 0.25, 0.5, 0.75]);
  });

  test('i avec reverse évalue g2 avant g1', () => {
    const log = [];
    i(spy([0], log, 'g1'), spy([1], log, 'g2'))(ctx(0, 0, 1, true));
    assert.deepEqual(log, ['g2', 'g1']);
  });

  test('boucle et trep', () => {
    assert.equal(boucle(ctime())(ctx(0, 7, 5)), 2);
    assert.deepEqual(L(4, trep(2, i(0, 4))), [0, 2, 0, 2]);
  });

  test('seq découpe le temps en parts égales et rend NIL au-delà', () => {
    assert.deepEqual(L(4, seq(10, 20)), [10, 10, 20, 20]);
    assert.deepEqual(L(4, seq(i(0, 2), 9)), [0, 1, 9, 9]);
    assert.equal(seq(1, 2)(ctx(0, 4, 4)), NIL);
    assert.deepEqual(L(4, rev(seq(10, 20))), [20, 20, 10, 10]);
  });
});

describe('combinateurs', () => {
  test('s sérialise et reprend la liste', () => {
    assert.deepEqual(L(5, s([1, 2, 3])), [1, 2, 3, 1, 2]);
    assert.deepEqual(L(5, s(alt([1, 2], [3]))), [1, 2, 3, 1, 2]);
  });

  test('s ne modifie pas la liste d’origine', () => {
    const l = Object.freeze([1, 2]);
    assert.deepEqual(L(3, s(l)), [1, 2, 1]);
  });

  test('borne et ecrete', () => {
    assert.equal(borne(0, 10, 12)(c0), 8);
    assert.equal(borne(0, 10, -2)(c0), 2);
    assert.equal(ecrete(0, 10, 12)(c0), 10);
    assert.equal(ecrete(0, 10, 5)(c0), 5);
  });

  test('h : uniforme, liste constante ou générée', () => {
    seed(4);
    const N = 40000;
    for (const [, n] of histogram(draw(h([90, 80, 70, 60]), N))) assert.ok(Math.abs(n - N / 4) < 0.05 * N / 4);
    assert.ok(draw(h(G([5])), 10).every((v) => v === 5));
    assert.throws(() => h([])(c0), RangeError); // (random 0)
  });

  test('hs épuise la liste avant de la reprendre, doublons compris', () => {
    seed(5);
    const g = hs([1, 2, 3, 4]);
    for (let r = 0; r < 5; r++) assert.deepEqual(draw(g, 4).sort(), [1, 2, 3, 4]);
    const w = hs([0, 0, 1]);
    for (let r = 0; r < 5; r++) assert.deepEqual(draw(w, 3).sort(), [0, 0, 1]);
  });

  test('combinaisons dans l’ordre du Lisp, et cb', () => {
    assert.deepEqual(combinaisons([1, 2]), [[1], [], [1, 2], [2]]);
    assert.equal(cb([1, 2, 3])(c0).length, 8);
  });

  test('nonil saute les NIL', () => {
    assert.deepEqual(L(2, nonil(s([null, 1, [], 2]))), [1, 2]);
  });

  test('rnd : bornes incluses, ordre indifférent, entier', () => {
    seed(6);
    const v = draw(rnd(38, 21), 5000);
    assert.equal(Math.min(...v), 21);
    assert.equal(Math.max(...v), 38);
    assert.ok(v.every(Number.isInteger));
    assert.ok(draw(rnd(126, 127), 100).every((x) => x === 126 || x === 127));
  });

  test('sel n’évalue que l’alternative choisie, avec round au pair', () => {
    const a = spy(['a']), b = spy(['b']);
    assert.equal(sel(1, a, b)(c0), 'b');
    assert.deepEqual([a.calls, b.calls], [0, 1]);
    assert.equal(sel(0.5, 'x', 'y')(c0), 'x'); // (round 0.5) = 0
    assert.equal(sel(1.5, 'x', 'y', 'z')(c0), 'z'); // (round 1.5) = 2
    assert.throws(() => sel(2, 'x', 'y')(c0), RangeError);
  });

  test('selr évalue toutes les alternatives, puis l’indice', () => {
    const log = [];
    assert.equal(selr(spy([0], log, 'i'), spy(['a'], log, 'a'), spy(['b'], log, 'b'))(c0), 'a');
    assert.deepEqual(log, ['a', 'b', 'i']);
  });

  test('alt, ralt, lalt', () => {
    assert.deepEqual(L(5, alt(1, 3)), [1, 3, 1, 3, 1]);
    assert.deepEqual(L(6, ralt('x', 'y', 'z')), ['x', 'y', 'x', 'z', 'x', 'y']);
    assert.deepEqual(L(6, lalt('x', 'y', 'z')), ['z', 'x', 'y', 'x', 'z', 'x']);
  });

  test('rdg et rdd (exemples Lisp), rdv', () => {
    assert.equal(rdg(G(minus), [10, 2, 3, 4, 5])(c0), -4);
    assert.equal(rdd(G(minus), [10, 2, 3, 4, 5])(c0), 12);
    assert.deepEqual(L(4, rdv(G(plus), 1)), [1, 2, 3, 4]);
    assert.deepEqual(L(5, rdv(G(Math.max), s([1, 6, 2, 12, 3]))), [1, 6, 6, 12, 12]);
  });

  test('dif évite deux valeurs égales de suite', () => {
    assert.deepEqual(L(4, dif(s([1, 1, 2, 2, 2, 3]))), [1, 2, 3, 1]);
    seed(7);
    const v = draw(dif(h([[1], [2]])), 50);
    for (let k = 1; k < v.length; k++) assert.notDeepEqual(v[k], v[k - 1]);
  });

  test('pf, freeze, pl, blk', () => {
    assert.deepEqual(L(3, pf(0, 7)), [0, 7, 7]);
    assert.deepEqual(L(3, freeze(s([4, 5, 6]))), [4, 4, 4]);
    assert.deepEqual(L(3, pl('a', 'z')), ['a', 'a', 'z']);
    assert.deepEqual(blk(3.7, s([1, 2]))(c0), [1, 2, 1]);
  });

  test('rep répète, et tire le nombre de répétitions avant la valeur', () => {
    assert.deepEqual(L(5, rep(s([7, 8]), 2)), [7, 7, 8, 8, 7]);
    assert.deepEqual(L(6, rep(s([1, 2, 3]), s([1, 2, 3]))), [1, 2, 2, 3, 3, 3]);
    const log = [];
    rep(spy([1], log, 'val'), spy([2], log, 'rep'))(c0);
    assert.deepEqual(log, ['rep', 'val']);
  });

  test('mem rejoue la boucle mémorisée et renouvelle tous les chg appels', () => {
    // source 1, 2, 3... ; boucle de 2 ; renouvellement tous les 3 appels
    assert.deepEqual(L(9, mem(rdv(G(plus), 1), 2, 3)), [1, 2, 1, 3, 1, 3, 4, 3, 4]);
  });

  test('mem : ordre size, src, chg', () => {
    const log = [];
    mem(spy([1], log, 'src'), spy([1], log, 'size'), spy([5], log, 'chg'))(c0);
    assert.deepEqual(log, ['size', 'src', 'chg']);
  });

  test('add, sub, mult, div, floo, mini, maxi', () => {
    assert.equal(add(16, 2, 3)(c0), 21);
    assert.equal(sub(10, 4)(c0), 6);
    assert.equal(sub(4)(c0), -4);
    assert.equal(mult(3, 4)(c0), 12);
    assert.equal(div(600, 2)(c0), 300);
    assert.equal(div(4)(c0), 0.25);
    assert.throws(() => div(1, 0)(c0), /Division by zero/);
    assert.equal(floo(div(7, 2))(c0), 3);
    assert.equal(floo(-0.5)(c0), -1);
    assert.equal(mini(4, 2, 8)(c0), 2);
    assert.equal(maxi(4, 2, 8)(c0), 8);
  });

  test('floo(i(70, 30)) décroît de 70 vers 30 au fil du temps', () => {
    assert.deepEqual(L(4, floo(i(70, 30))), [70, 60, 50, 40]);
  });

  test('frag', () => assert.deepEqual(L(5, frag(s([6, 9]), s([2, 3]))), [3, 3, 3, 3, 3]));

  test('shift (exemple Lisp) et ses 256 évaluations initiales', () => {
    assert.deepEqual(L(2, shift(2, s([1, 2, 3, 4]))), [3, 4]);
    const g = spy([0]);
    shift(1, g)(c0);
    assert.equal(g.calls, 257);
    assert.deepEqual(L(3, shift(-1, s([1, 2, 3, 4]))), [4, 1, 2]);
  });

  test('freq (exemple Lisp)', () => {
    assert.deepEqual(L(2, freq(2, s([1, 2, 3, 4]))), [2, 4]);
    assert.deepEqual(L(4, freq(0.5, s([1, 2, 3, 4]))), [1, 1, 2, 2]);
  });

  test('gor, gand, gnot, ggnot, gmod', () => {
    assert.equal(gor(null, [], 3, 4)(c0), 3);
    assert.equal(gor(null, false)(c0), NIL);
    assert.equal(gand(1, 0, 'a')(c0), T);
    assert.equal(gand(1, null)(c0), NIL);
    assert.equal(gnot([null])(c0), T);
    assert.equal(ggnot(0)(c0), NIL);
    assert.equal(ggnot([])(c0), T);
    assert.equal(gmod(-1, 16)(c0), 15);
  });

  test('gate, pulse (avec et sans phase), gpgate', () => {
    assert.deepEqual(L(5, gate(2, 1)), [T, T, NIL, T, T]);
    assert.deepEqual(L(6, pulse(3)), [T, NIL, NIL, T, NIL, NIL]);
    assert.deepEqual(L(3, pulse(3, 1)), [NIL, NIL, T]);
    seed(8);
    const v = draw(gpgate(0.3, 'o', 'f'), 20000);
    assert.ok(Math.abs(v.filter((x) => x === 'o').length / v.length - 0.3) < 0.02);
    assert.equal(gpgate(0, 1)(c0), NIL);
  });

  test('gbrown et gbrown2 restent dans les bornes', () => {
    seed(9);
    const a = draw(gbrown(50, 0, 100, h([-7, 7])), 2000);
    const b = draw(gbrown2(50, 0, 100, h([-7, 7])), 2000);
    assert.ok([...a, ...b].every((x) => x >= 0 && x <= 100));
    assert.deepEqual(L(4, gbrown2(0, 0, 3, 1)), [0, 1, 2, 3]);
  });

  test('greplie : ordre min, max, x', () => {
    assert.equal(greplie(13, 0, 10)(c0), 7);
    const log = [];
    greplie(spy([5], log, 'x'), spy([0], log, 'min'), spy([10], log, 'max'))(c0);
    assert.deepEqual(log, ['min', 'max', 'x']);
  });

  test('sinus et osc', () => {
    const r9 = (x) => Math.round(x * 1e9) / 1e9 || 0; // || 0 : ramène -0 à 0
    const v = L(4, sinus(4)).map(r9);
    assert.deepEqual(v, [1, 0, -1, 0]);
    const o = L(4, osc(4, 10, 20)).map(r9);
    assert.deepEqual(o, [20, 15, 10, 15]);
  });

  test('gosc et gosc2', () => {
    assert.deepEqual(L(6, gosc(0, 0, 3, 1)), [0, 1, 2, 3, 2, 1]);
    assert.deepEqual(L(8, gosc2(0, 0, 3, 1)), [0, 1, 2, 3, 2, 1, 0, 1]);
    assert.deepEqual(L(4, gosc2(0, 0, 10, 4)), [0, 4, 8, 10]);
  });

  test('pblk (exemple Lisp)', () => {
    assert.deepEqual(L(4, pblk([['x', 'y'], ['y', 'x', 'y']], rdv(G(plus), 1))), [[1, 2], [2, 1, 2], [3, 4], [4, 3, 4]]);
  });

  test('perm passe d’une liste à l’autre élément par élément', () => {
    seed(10);
    const v = L(10, perm(alt([1, 2, 3, 4, 5], ['a', 'b', 'c', 'd', 'e'])));
    assert.deepEqual(v[4], ['a', 'b', 'c', 'd', 'e']);
    assert.deepEqual(v[9], [1, 2, 3, 4, 5]);
    for (let k = 1; k < 5; k++) {
      const diff = v[k].filter((x, j) => x !== v[k - 1][j]).length;
      assert.equal(diff, 1);
    }
  });
});

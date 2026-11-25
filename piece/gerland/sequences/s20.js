/**
 * @file Séquence 20 (3' - 7').
 *
 * Généré par `npm run transpile` (transpiler/) depuis source/Gerland2013-4.lsp.
 * Ne pas modifier à la main : corriger le transpileur, puis régénérer.
 * tests/transpile.test.js vérifie que ce fichier est à jour.
 *
 * Commentaire d'origine :
 *     Séquence 20 (3' - 7')
 *     Trajectoires          Multi M2
 *     version pour 16 points
 *     percus rares répétées
 *     trajectoires completes sur les 16 enceintes enchainées
 */

import { add, freeGen, gnotes, h, hs, mult, nGnotes, nProrythme, placeTempo, prorythme, rep, rnd, s, sel, shareGen, t, useGen } from '../../../core/index.js';
import { nconcatSpe4, once, placeProg, printDialog, selAl, xconcat } from '../tools.js';
import { GACCORD, GECAR, MULTIS, ZONE1, ZONE2, ZONE3 } from '../config.js';

/**
 * Séquence 20.
 * Traduction de `(sequence-20 deb fin)`, lignes 3119 à 3233.
 * @param {import('../../../core/score.js').Score} score Partition où écrire.
 * @param {import('../../../core/generators.js').GenLike} deb Début (noires), tiré une fois.
 * @param {import('../../../core/generators.js').GenLike} fin Fin (noires), tirée une fois.
 * @returns {void}
 */
export function sequence20(score, deb, fin) {
  printDialog(score, 'SEQUENCE 20');
  // prog-change
  placeProg(score, 0, MULTIS.m2);
  placeTempo(score, 0, 60);
  const deb2 = once(deb);
  const fin2 = once(fin);
  // un peu de "tenu" jour / nuit brèves aléatoires synchro
  prorythme(score, 16, add(deb2, h([0, 1, 2, 4, 6, 7, 8, 10])), fin2,
    gnotes({ laccord: GACCORD, lecar: GECAR }),
    h([20, 20, 32, 44]),
    selAl(5, [10], [5], [6], [7], [8], [9]),
    rnd(21, 68),
    40);
  // percus rares répétées
  shareGen('n1', h([1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4]));
  nProrythme(score, deb2, fin2, h([3, 4, 5, 7, 9, 12, 15]),
    selAl(
      3,
      nGnotes(
        rep(h(ZONE1), useGen('n1')),
        xconcat(useGen('n1'), selAl(3, [4], [3], [5], [8])),
        rep(h([70, 79, 82]), useGen('n1')),
        90),
      nGnotes(
        rep(h(ZONE2), useGen('n1')),
        xconcat(useGen('n1'), selAl(3, [4], [3], [5], [8])),
        rep(h([70, 79, 82]), useGen('n1')),
        90),
      nGnotes(
        rep(h(ZONE3), useGen('n1')),
        xconcat(useGen('n1'), selAl(3, [4], [3], [5], [8])),
        rep(h([70, 79, 82]), useGen('n1')),
        90),
      nGnotes(rnd(0, 15), [12], rnd(69, 125), 80)));
  freeGen('n1');
  // percus rares répétées
  shareGen('n1', h([1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4]));
  nProrythme(score, deb2, fin2, h([3, 4, 5, 7, 9, 12, 15]),
    selAl(
      3,
      nGnotes(
        rep(h(ZONE1), useGen('n1')),
        xconcat(useGen('n1'), selAl(3, [4], [3], [5], [8])),
        rep(h([70, 79, 82]), useGen('n1')),
        90),
      nGnotes(
        rep(h(ZONE2), useGen('n1')),
        xconcat(useGen('n1'), selAl(3, [4], [3], [5], [8])),
        rep(h([70, 79, 82]), useGen('n1')),
        90),
      nGnotes(
        rep(h(ZONE3), useGen('n1')),
        xconcat(useGen('n1'), selAl(3, [4], [3], [5], [8])),
        rep(h([70, 79, 82]), useGen('n1')),
        90),
      nGnotes(rnd(0, 15), [12], rnd(69, 125), 80)));
  freeGen('n1');
  // trajectoires completes sur les 16 enceintes enchainées
  shareGen('t1', sel(
    h([0, 1, 2, 4]),
    [0, 1, 4, 5, 6, 7, 12, 13, 15, 14, 11, 10, 9, 8, 3, 2],
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    [15, 14, 13, 12, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
    [0, 2, 3, 1, 4, 8, 9, 5, 6, 10, 11, 7, 12, 14, 15, 14, 11, 7, 6, 10, 9, 5, 4, 8, 3, 1],
    nconcatSpe4(16, hs([0, 1, 4, 5, 6, 7, 12, 13, 15, 14, 11, 10, 9, 8, 3, 2]))));
  // Dans le Lisp, les instructions qui suivent sont les arguments d'un appel (sel ...) (ligne 3203).
  // Une fonction évalue tous ses arguments : elles s'exécutent donc TOUTES, dans l'ordre, et le
  // générateur construit par sel n'est jamais utilisé. Comportement de 2013, conservé.
  // argument sans effet, non traduit : (rnd °0 °3)
  shareGen('ntraj', h([4, 5, 6, 7, 8, 9, 10, 12, 14]));
  prorythme(score, s(useGen('t1')), add(deb2, h([0, 1, 2, 4, 6, 7, 8, 10])), fin2,
    gnotes(),
    h([7, 9, 11, 17]),
    sel(
      rnd(0, 3),
      xconcat(useGen('ntraj'), [t('2/3c', [1 / 4, 1 / 4, 1 / 4])]),
      xconcat(useGen('ntraj'), [1 / 8, 1 / 8, 1 / 8]),
      xconcat(useGen('ntraj'), [1 / 4, 1 / 4, 1 / 4]),
      xconcat(useGen('ntraj'), [1 / 2, 1 / 2, 1 / 2])),
    rep(h([69, 70, 71, 74, 76, 77, 78, 79, 80, 81, 92, 93, 94, 95, 96, 108]), mult(3, useGen('ntraj'))),
    80);
  freeGen('ntraj');
  shareGen('ntraj', h([4, 5, 6, 7, 8, 9, 10, 12, 14]));
  prorythme(score, add(16, s(useGen('t1'))), add(deb2, h([0, 1, 2, 4, 6, 7, 8, 10])), fin2,
    gnotes(),
    h([7, 9, 11, 17]),
    sel(
      rnd(0, 3),
      xconcat(useGen('ntraj'), [t('2/3c', [1 / 4, 1 / 4, 1 / 4])]),
      xconcat(useGen('ntraj'), [1 / 8, 1 / 8, 1 / 8]),
      xconcat(useGen('ntraj'), [1 / 4, 1 / 4, 1 / 4]),
      xconcat(useGen('ntraj'), [1 / 2, 1 / 2, 1 / 2])),
    rep(rnd(69, 125), mult(3, useGen('ntraj'))),
    80);
  freeGen('ntraj');
  freeGen('t1');
}

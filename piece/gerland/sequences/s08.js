/**
 * @file Séquence 8 (4' - 8').
 *
 * Généré par `npm run transpile` (transpiler/) depuis source/Gerland2013-4.lsp.
 * Ne pas modifier à la main : corriger le transpileur, puis régénérer.
 * tests/transpile.test.js vérifie que ce fichier est à jour.
 *
 * Commentaire d'origine :
 *     Séquence 8 (4' - 8')
 *     Percu Zen
 *     version pour 16 points         Multi M2
 *     avec fond général jour ou nuit par brefs moments
 *     avec percus rares répétées
 *     avec phrase monocanal de percu
 *     avec insectes aléatoires rares
 */

import { add, concat, freeGen, gnotes, h, nconcat, nGnotes, nProrythme, placeTempo, prorythme, rep, rnd, sel, shareGen, sub, useGen } from '../../../core/index.js';
import { once, placeProg, printDialog, selAl, xconcat } from '../tools.js';
import { MULTIS, ZONE1, ZONE2, ZONE3 } from '../config.js';

/**
 * Séquence 8.
 * Traduction de `(sequence-8 deb fin)`, lignes 1558 à 1640.
 * @param {import('../../../core/score.js').Score} score Partition où écrire.
 * @param {import('../../../core/generators.js').GenLike} deb Début (noires), tiré une fois.
 * @param {import('../../../core/generators.js').GenLike} fin Fin (noires), tirée une fois.
 * @returns {void}
 */
export function sequence8(score, deb, fin) {
  printDialog(score, 'SEQUENCE 8');
  // prog-change
  placeProg(score, 0, MULTIS.m2);
  placeTempo(score, 0, 60);
  const deb2 = once(deb);
  const fin2 = once(fin);
  // un peu de "tenu" jour / nuit brèves aléatoires
  prorythme(score, rnd(16, 31), add(deb2, h([0, 1, 2, 4, 6, 7, 8, 10])), fin2,
    gnotes(),
    h([6, 12, 16, 16, 20]),
    selAl(5, [2], [4], [5], [6], [7], [8]),
    rnd(21, 68),
    h([60, 70, 50]));
  // percus rares répétées
  // zone1
  shareGen('n1', h([1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 5, 5]));
  nProrythme(score, deb2, fin2, h([0, 1, 2, 3, 4, 5]),
    sel(
      h([0, 0, 0, 0, 0, 1]),
      nGnotes(
        rep(h(ZONE1), useGen('n1')),
        xconcat(useGen('n1'), selAl(4, [4], [2], [3], [5], [8])),
        rep(h([70, 71, 74, 76, 77, 78, 80, 84, 85]), useGen('n1')),
        100),
      nGnotes(h(ZONE1), [16], 75, 70)));
  freeGen('n1');
  // zone2
  shareGen('n1', h([1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 5, 5]));
  nProrythme(score, deb2, fin2, h([0, 1, 2, 3, 4, 5]),
    sel(
      h([0, 0, 0, 0, 0, 1]),
      nGnotes(
        rep(h(ZONE2), useGen('n1')),
        xconcat(useGen('n1'), selAl(4, [4], [2], [3], [5], [8])),
        rep(h([70, 71, 74, 76, 77, 78, 80, 84, 85]), useGen('n1')),
        100),
      nGnotes(h(ZONE2), [16], 75, 70)));
  freeGen('n1');
  // zone3
  shareGen('n1', h([1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 5, 5]));
  nProrythme(score, deb2, fin2, h([0, 1, 2, 3, 4, 5]),
    sel(
      h([0, 0, 0, 0, 0, 1]),
      nGnotes(
        rep(h(ZONE3), useGen('n1')),
        xconcat(useGen('n1'), selAl(4, [4], [2], [3], [5], [8])),
        rep(h([70, 71, 74, 76, 77, 78, 80, 84, 85]), useGen('n1')),
        100),
      nGnotes(h(ZONE3), [16], 75, 70)));
  freeGen('n1');
  // phrase monocanal de percu
  shareGen('n1', h([4, 6, 8, 12, 13, 14, 15, 16, 17, 18]));
  prorythme(score, rep(rnd(0, 15), useGen('n1')), add(deb2, h([0, 1, 2, 4, 6, 7, 8, 10])), fin2,
    gnotes({ proba: h([1, 1, 1, 1, 1, 0]) }),
    h([16, 8, 24]),
    concat([1 / 2], nconcat(sub(useGen('n1'), 2), [1 / 8]), [4]),
    rep(rnd(69, 96), h([1, 1, 1, 2, 3])),
    90);
  freeGen('n1');
  // insectes aléatoires rares
  prorythme(score, rnd(16, 31), add(deb2, h([0, 1, 2, 3, 4, 5, 6, 8, 10])), fin2,
    gnotes(),
    h([0, 4, 4, 6, 8]),
    selAl(5, [1 / 4], [1 / 2], [1], [3 / 2], [3], [5]),
    rnd(69, 78),
    h([90, 70, 80]));
}

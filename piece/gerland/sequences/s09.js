/**
 * @file Séquence 9 (4' - 8').
 *
 * Généré par `npm run transpile` (transpiler/) depuis source/Gerland2013-4.lsp.
 * Ne pas modifier à la main : corriger le transpileur, puis régénérer.
 * tests/transpile.test.js vérifie que ce fichier est à jour.
 *
 * Commentaire d'origine :
 *     Séquence 9 (4' - 8')
 *     Percu Trajectoires
 *     version pour 16 points         Multi M2
 *     avec fond général jour / nuit synchro par moments brefs
 *     avec percus rares répétées (2 fois)
 *     avec trajectoires de percussions
 */

import { add, freeGen, gnotes, h, mult, nGnotes, nProrythme, placeTempo, prorythme, rep, rnd, s, sel, shareGen, t, useGen } from '../../../core/index.js';
import { once, placeProg, printDialog, selAl, traj, xconcat } from '../tools.js';
import { GACCORD_DEMI, GECAR, MULTIS, trajectoires, ZONE1, ZONE2, ZONE3 } from '../config.js';

/**
 * Séquence 9.
 * Traduction de `(sequence-9 deb fin)`, lignes 1662 à 1750.
 * @param {import('../../../core/score.js').Score} score Partition où écrire.
 * @param {import('../../../core/generators.js').GenLike} deb Début (noires), tiré une fois.
 * @param {import('../../../core/generators.js').GenLike} fin Fin (noires), tirée une fois.
 * @returns {void}
 */
export function sequence9(score, deb, fin) {
  printDialog(score, 'SEQUENCE 9');
  // prog-change
  placeProg(score, 0, MULTIS.m2);
  placeTempo(score, 0, 60);
  const deb2 = once(deb);
  const fin2 = once(fin);
  // un peu de "tenu" jour / nuit brèves aléatoires synchro
  prorythme(score, 16, deb2, fin2,
    gnotes({ laccord: GACCORD_DEMI, lecar: GECAR }),
    h([20, 20, 32]),
    selAl(5, [14], [7], [8], [9], [10], [12]),
    rnd(21, 68),
    40);
  // percus rares répétées
  // zone1
  shareGen('n1', h([1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 5, 5, 5, 5, 5]));
  nProrythme(score, add(deb2, h([0, 1, 2, 4, 6, 7, 8, 10])), fin2, h([3, 6, 9]),
    sel(
      h([0, 0, 0, 1]),
      nGnotes(
        rep(h(ZONE1), useGen('n1')),
        xconcat(useGen('n1'), selAl(3, [4], [3], [5], [6])),
        rep(h([70, 71, 74, 76, 77, 78, 80, 84, 85]), useGen('n1')),
        90),
      nGnotes(h(ZONE1), [12], rnd(69, 125), 70)));
  freeGen('n1');
  // zone2
  shareGen('n1', h([1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 5, 5, 5, 5, 5]));
  nProrythme(score, add(deb2, h([0, 1, 2, 4, 6, 7, 8, 10])), fin2, h([3, 6, 9]),
    sel(
      h([0, 0, 0, 1]),
      nGnotes(
        rep(h(ZONE2), useGen('n1')),
        xconcat(useGen('n1'), selAl(3, [4], [3], [5], [6])),
        rep(h([70, 71, 74, 76, 77, 78, 80, 84, 85]), useGen('n1')),
        90),
      nGnotes(h(ZONE2), [12], rnd(69, 125), 70)));
  freeGen('n1');
  // zone3
  shareGen('n1', h([1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 5, 5, 5, 5, 5]));
  nProrythme(score, add(deb2, h([0, 1, 2, 4, 6, 7, 8, 10])), fin2, h([3, 6, 9]),
    sel(
      h([0, 0, 0, 1]),
      nGnotes(
        rep(h(ZONE3), useGen('n1')),
        xconcat(useGen('n1'), selAl(3, [4], [3], [5], [6])),
        rep(h([70, 71, 74, 76, 77, 78, 80, 84, 85]), useGen('n1')),
        90),
      nGnotes(h(ZONE3), [12], rnd(69, 125), 70)));
  freeGen('n1');
  // trajectoires aléatoires d'oiseaux aléatoires ;;
  // soit des trajectoires de 12, 15 ou 18 points
  shareGen('ntraj', h([4, 5, 6, 7, 8, 9, 10, 10, 16]));
  // soit des trajectoires de 12, 15 ou 18 points
  prorythme(score, add(16, s(traj(trajectoires(), mult(3, useGen('ntraj'))))), add(deb2, h([0, 2, 4, 6, 7, 8, 10])), fin2,
    gnotes(),
    h([1, 8, 16, 16]),
    selAl(
      1,
      xconcat(useGen('ntraj'), [t('2/3c', [1 / 4, 1 / 4, 1 / 4])]),
      xconcat(useGen('ntraj'), [1 / 8, 1 / 8, 1 / 8])),
    rep(h([69, 70, 71, 74, 76, 77, 78, 79, 80, 81, 92, 93, 94, 95, 96, 108]), mult(3, useGen('ntraj'))),
    90);
  freeGen('ntraj');
  shareGen('ntraj', h([4, 5, 6, 7, 8, 9, 10, 10, 16]));
  // soit des trajectoires de 12, 15 ou 18 points
  prorythme(score, add(16, s(traj(trajectoires(), mult(3, useGen('ntraj'))))), add(deb2, h([0, 2, 4, 6, 7, 8, 10])), fin2,
    gnotes(),
    h([1, 8, 16, 16]),
    selAl(
      1,
      xconcat(useGen('ntraj'), [t('2/3c', [1 / 4, 1 / 4, 1 / 4])]),
      xconcat(useGen('ntraj'), [1 / 8, 1 / 8, 1 / 8])),
    rep(h([69, 70, 71, 74, 76, 77, 78, 79, 80, 81, 92, 93, 94, 95, 96, 108]), mult(3, useGen('ntraj'))),
    90);
  freeGen('ntraj');
}

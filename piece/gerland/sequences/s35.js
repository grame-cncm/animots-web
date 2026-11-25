/**
 * @file Séquence 35 (3' - 5').
 *
 * Généré par `npm run transpile` (transpiler/) depuis source/Gerland2013-4.lsp.
 * Ne pas modifier à la main : corriger le transpileur, puis régénérer.
 * tests/transpile.test.js vérifie que ce fichier est à jour.
 *
 * Commentaire d'origine :
 *     Séquence 35 (3' - 5')
 *     version pour 16 points groupés         Multi M7
 *     trajectoires circulaires de guiro longuement répétées, long staccato
 *     avec accidents de percu
 */

import { add, concat, freeGen, gnotes, h, hs, lst, nconcat, placeTempo, prorythme, rep, rnd, s, sel, shareGen, useGen } from '../../../core/index.js';
import { once, placeProg, printDialog } from '../tools.js';
import { MULTIS, TRAJ_TOTAL_DIRECT, TRAJ_ZIG_ZAG } from '../config.js';

/**
 * Séquence 35.
 * Traduction de `(sequence-35 deb fin)`, lignes 4592 à 4612.
 * @param {import('../../../core/score.js').Score} score Partition où écrire.
 * @param {import('../../../core/generators.js').GenLike} deb Début (noires), tiré une fois.
 * @param {import('../../../core/generators.js').GenLike} fin Fin (noires), tirée une fois.
 * @returns {void}
 */
export function sequence35(score, deb, fin) {
  printDialog(score, 'SEQUENCE 35');
  // prog-change
  placeProg(score, 0, MULTIS.m7);
  placeTempo(score, 0, 60);
  const deb2 = once(deb);
  const fin2 = once(fin);
  // voix aléatoires longuement répétées
  shareGen('choix', h([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]));
  prorythme(score, s(concat(lst(rnd(0, 15)), sel(h([0, 1]), TRAJ_TOTAL_DIRECT, TRAJ_ZIG_ZAG))), add(deb2, 0), fin2,
    gnotes({ stac: 5 }),
    h([0, 2, 4, 6, 8, 10]),
    nconcat(
      rnd(3, 16),
      sel(
        h([0, 0, 0, 0, 0, 0, 1, 1, 2]),
        [1 / 8, 1 / 8, 1 / 8, 1 / 8],
        [1 / 4, 1 / 4],
        [1 / 4, 1 / 4, 1 / 4, 1 / 4])),
    sel(
      useGen('choix'),
      rep(hs([23, 28, 30, 32, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49]), rnd(60, 80)),
      rnd(69, 96)),
    sel(
      useGen('choix'),
      add(-15, s([110, 75, 75, 75, 75, 75, 75, 75, 75, 75, 75, 75, 75, 75, 75, 75, 75])),
      80));
  freeGen('choix');
}

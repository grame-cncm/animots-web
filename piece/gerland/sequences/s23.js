/**
 * @file Séquence 23 (2' - 5').
 *
 * Généré par `npm run transpile` (transpiler/) depuis source/Gerland2013-4.lsp.
 * Ne pas modifier à la main : corriger le transpileur, puis régénérer.
 * tests/transpile.test.js vérifie que ce fichier est à jour.
 *
 * Commentaire d'origine :
 *     Séquence 23 (2' - 5')
 *     version pour 16 points groupés         Multi M7
 *     trajectoires circulaires de voix aléatoires longuement répétées
 *     alternées avec petits objets, long staccato
 *     avec accidents de percu
 */

import { add, concat, gnotes, h, hs, lst, placeTempo, prorythme, rep, rnd, s, sel } from '../../../core/index.js';
import { once, placeProg, printDialog } from '../tools.js';
import { MULTIS, TRAJ_TOTAL_DIRECT2, TRAJ_ZIG_ZAG } from '../config.js';

/**
 * Séquence 23.
 * Traduction de `(sequence-23 deb fin)`, lignes 3370 à 3392.
 * @param {import('../../../core/score.js').Score} score Partition où écrire.
 * @param {import('../../../core/generators.js').GenLike} deb Début (noires), tiré une fois.
 * @param {import('../../../core/generators.js').GenLike} fin Fin (noires), tirée une fois.
 * @returns {void}
 */
export function sequence23(score, deb, fin) {
  printDialog(score, 'SEQUENCE 23');
  // prog-change
  placeProg(score, 0, MULTIS.m7);
  placeTempo(score, 0, 60);
  const deb2 = once(deb);
  const fin2 = once(fin);
  // voix aléatoires longuement répétées
  prorythme(score, s(concat(lst(rnd(0, 15)), sel(h([0, 1]), TRAJ_TOTAL_DIRECT2, TRAJ_ZIG_ZAG))), add(deb2, 0), fin2,
    gnotes({ stac: 5 }),
    h([0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 4, 8]),
    sel(
      h([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 2]),
      [1 / 8, 1 / 8, 1 / 8, 1 / 8],
      [1 / 4, 1 / 4],
      [1 / 4, 1 / 4, 1 / 4, 1 / 4]),
    rep(hs([23, 28, 30, 32, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49]), rnd(60, 80)),
    add(-20, s([110, 75, 75, 75, 75, 75, 75, 75, 75, 75, 75, 75, 75, 75, 75, 75, 75])));
}

/**
 * @file Séquence 24 (3' - 5').
 *
 * Généré par `npm run transpile` (transpiler/) depuis source/Gerland2013-4.lsp.
 * Ne pas modifier à la main : corriger le transpileur, puis régénérer.
 * tests/transpile.test.js vérifie que ce fichier est à jour.
 *
 * Commentaire d'origine :
 *     Séquence 24 (3' - 5')
 *     version pour 16 points groupés         Multi M7
 *     trajectoires circulaires de voix aléatoires répétées
 *     trajectoires circulaires de percus répétées désynchronisées
 */

import { add, gnotes, h, nconcat, placeTempo, prorythme, rep, rnd, s, sel } from '../../../core/index.js';
import { once, placeProg, printDialog } from '../tools.js';
import { MULTIS, TRAJ_TOTAL_DIRECT2, TRAJ_TOTAL_INDIRECT, TRAJ_ZIG_ZAG2 } from '../config.js';

/**
 * Séquence 24.
 * Traduction de `(sequence-24 deb fin)`, lignes 3414 à 3446.
 * @param {import('../../../core/score.js').Score} score Partition où écrire.
 * @param {import('../../../core/generators.js').GenLike} deb Début (noires), tiré une fois.
 * @param {import('../../../core/generators.js').GenLike} fin Fin (noires), tirée une fois.
 * @returns {void}
 */
export function sequence24(score, deb, fin) {
  printDialog(score, 'SEQUENCE 24');
  // prog-change
  placeProg(score, 0, MULTIS.m7);
  placeTempo(score, 0, 60);
  const deb2 = once(deb);
  const fin2 = once(fin);
  // voix  aléatoires répétées
  // (h °(6 8 10 16 20))
  prorythme(score, s(sel(h([0, 1]), TRAJ_TOTAL_DIRECT2, TRAJ_ZIG_ZAG2)), add(deb2, 0), fin2,
    gnotes({ stac: 5 }),
    h([12, 16, 20]),
    nconcat(
      rnd(3, 10),
      sel(
        h([0, 0, 0, 0, 0, 0, 1, 1, 2]),
        [1 / 8, 1 / 8, 1 / 8, 1 / 8],
        [1 / 4, 1 / 4],
        [1 / 4, 1 / 4, 1 / 4, 1 / 4])),
    rep(rnd(21, 50), h([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])),
    rep(h([50, 40, 60]), h([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])));
  // percus  aléatoires répétées asynchrones
  prorythme(score, s(TRAJ_TOTAL_INDIRECT), add(deb2, 0), fin2,
    gnotes(),
    h([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 4, 4, 6]),
    sel(h([0, 0, 0, 0, 1, 1, 2]), [1 / 8, 1 / 8, 1 / 8, 1 / 8], [1 / 4, 1 / 4], [1 / 4, 1 / 4, 1 / 4, 1 / 4]),
    rep(rnd(69, 125), h([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])),
    rep(h([80, 90, 100]), h([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])));
}

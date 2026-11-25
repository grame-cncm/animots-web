/**
 * @file Séquence 32 (3' - 5').
 *
 * Généré par `npm run transpile` (transpiler/) depuis source/Gerland2013-4.lsp.
 * Ne pas modifier à la main : corriger le transpileur, puis régénérer.
 * tests/transpile.test.js vérifie que ce fichier est à jour.
 *
 * Commentaire d'origine :
 *     Séquence 32 (3' - 5')
 *     violons harmoniques lents, synchronisés et calmes 2        Multi M9
 *     version pour 16 points
 */

import { floo, gnotes, h, hs, i, placeTempo, prorythme, rep, rnd } from '../../../core/index.js';
import { listNvaleur, once, placeProg, printDialog } from '../tools.js';
import { MULTIS } from '../config.js';

/**
 * Séquence 32.
 * Traduction de `(sequence-32 deb fin)`, lignes 4453 à 4471.
 * @param {import('../../../core/score.js').Score} score Partition où écrire.
 * @param {import('../../../core/generators.js').GenLike} deb Début (noires), tiré une fois.
 * @param {import('../../../core/generators.js').GenLike} fin Fin (noires), tirée une fois.
 * @returns {void}
 */
export function sequence32(score, deb, fin) {
  printDialog(score, 'SEQUENCE 32');
  // prog-change
  placeProg(score, 0, MULTIS.m9);
  placeTempo(score, 0, 60);
  const deb2 = once(deb);
  const fin2 = once(fin);
  // (gnotes :laccord (list-nvaleur °8 (hs °(0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15))) :lecar (list-nvaleur °8 (hs °(0 0 0 3.86 3.86 3.86 7.02 7.02 7.02 9.69 9.69 12 14.04 15.86 17.51 19.02 20.41))))
  prorythme(score, 0, deb2, fin2,
    gnotes(
      { laccord: listNvaleur(8, hs([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])), lecar: listNvaleur(8, hs([0, 0, 0, 4, 4, 4, 7, 7, 7, 10, 10, 12, 14, 16, 18, 19, 20])) }),
    h([0, 2, 4, 6, 8, 8, 10]),
    h([[6], [10], [12], [14], [11], [16]]),
    rep(rnd(55, floo(i(55, 68))), rnd(1, 4)),
    50);
}

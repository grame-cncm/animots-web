/**
 * @file Séquence 34 (3' - 5').
 *
 * Généré par `npm run transpile` (transpiler/) depuis source/Gerland2013-4.lsp.
 * Ne pas modifier à la main : corriger le transpileur, puis régénérer.
 * tests/transpile.test.js vérifie que ce fichier est à jour.
 *
 * Commentaire d'origine :
 *     Séquence 34 (3' - 5')
 *     Rivière seule
 *     version pour 16 points         Multi M2
 *     avec un peu d'insectes et oiseaux aléatoire
 */

import { add, freeGen, gnotes, h, lst, placeTempo, prorythme, rep, rnd, shareGen, sub, useGen } from '../../../core/index.js';
import { nconcatSpe4, once, placeProg, printDialog, selAl } from '../tools.js';
import { GACCORD, GECAR, MULTIS } from '../config.js';

/**
 * Séquence 34.
 * Traduction de `(sequence-34 deb fin)`, lignes 4542 à 4570.
 * @param {import('../../../core/score.js').Score} score Partition où écrire.
 * @param {import('../../../core/generators.js').GenLike} deb Début (noires), tiré une fois.
 * @param {import('../../../core/generators.js').GenLike} fin Fin (noires), tirée une fois.
 * @returns {void}
 */
export function sequence34(score, deb, fin) {
  printDialog(score, 'SEQUENCE 34');
  // prog-change
  placeProg(score, 0, MULTIS.m2);
  placeTempo(score, 0, 60);
  const deb2 = once(deb);
  const fin2 = once(fin);
  // fond général Rivière
  prorythme(score, 0, deb2, fin2,
    gnotes({ laccord: GACCORD, lecar: GECAR }),
    0,
    lst(sub(fin2, deb2)),
    126,
    70);
  // un peu d'oiseaux aléatoires
  shareGen('nbre', rnd(1, 4));
  prorythme(score, 0, add(deb2, h([0, 2, 4, 6, 7, 8, 10])), fin2,
    gnotes({ laccord: rep(nconcatSpe4(rnd(3, 8), rnd(16, 31)), useGen('nbre')), lecar: GECAR }),
    h([4, 6, 8, 8, 10, 12]),
    selAl(4, [1 / 2], [1], [3 / 2], [3], [5]),
    rep(rnd(69, 125), useGen('nbre')),
    h([60, 50, 70]));
  freeGen('nbre');
}

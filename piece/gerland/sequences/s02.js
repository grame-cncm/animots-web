/**
 * @file Séquence 2 (5' - 10').
 *
 * Généré par `npm run transpile` (transpiler/) depuis source/Gerland2013-4.lsp.
 * Ne pas modifier à la main : corriger le transpileur, puis régénérer.
 * tests/transpile.test.js vérifie que ce fichier est à jour.
 *
 * Commentaire d'origine :
 *     Séquence 2 (5' - 10')
 *     Nuit         Multi M2
 *     version pour 16 points
 */

import { add, freeGen, gnotes, h, lst, placeTempo, prorythme, rep, rnd, shareGen, sub, useGen } from '../../../core/index.js';
import { once, placeProg, printDialog, selAl, xconcat } from '../tools.js';
import { GACCORD_DEMI, GECAR, MULTIS, ZONE1, ZONE2, ZONE3 } from '../config.js';

/**
 * Séquence 2.
 * Traduction de `(sequence-2 deb fin)`, lignes 886 à 914.
 * @param {import('../../../core/score.js').Score} score Partition où écrire.
 * @param {import('../../../core/generators.js').GenLike} deb Début (noires), tiré une fois.
 * @param {import('../../../core/generators.js').GenLike} fin Fin (noires), tirée une fois.
 * @returns {void}
 */
export function sequence2(score, deb, fin) {
  printDialog(score, 'SEQUENCE 2');
  // prog-change
  placeProg(score, 0, MULTIS.m2);
  placeTempo(score, 0, 60);
  // fond général nuit synchro  proba 1/2
  const deb2 = once(deb);
  const fin2 = once(fin);
  prorythme(score, 16, deb2, fin2,
    gnotes({ laccord: GACCORD_DEMI, lecar: GECAR }),
    0,
    lst(sub(fin2, deb2)),
    rnd(21, 38),
    30);
  // oiseaux et insectes aléatoires répété 1 ou 2 fois sur un même canal (diffusé sur de 3 à 8 canaux)
  shareGen('n1', h([1, 2, 1, 2, 3]));
  prorythme(score, 16, add(deb2, h([0, 2, 4, 6, 7, 8, 10])), fin2,
    gnotes({ laccord: lst(h(ZONE1), h(ZONE2), h(ZONE3)), lecar: GECAR }),
    h([0, 4, 4, 6, 8]),
    xconcat(useGen('n1'), selAl(4, [1 / 2], [1], [3 / 2], [3], [5])),
    rep(rnd(69, 85), useGen('n1')),
    rep(h([90, 80, 70]), useGen('n1')));
  freeGen('n1');
}

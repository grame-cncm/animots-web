/**
 * @file Séquence 36 (3' - 6').
 *
 * Généré par `npm run transpile` (transpiler/) depuis source/Gerland2013-4.lsp.
 * Ne pas modifier à la main : corriger le transpileur, puis régénérer.
 * tests/transpile.test.js vérifie que ce fichier est à jour.
 *
 * Commentaire d'origine :
 *     Séquence 36 (3' - 6')
 *     2 phrases monorales de percu-castagnet
 *     version pour 16 points         Multi M2
 *     avec insectes et oiseaux aléatoire
 *     avec phrase monocanal de castagnet
 */

import { add, concat, freeGen, gnotes, h, nconcat, placeTempo, prorythme, rep, rnd, shareGen, sub, useGen } from '../../../core/index.js';
import { once, placeProg, printDialog, selAl } from '../tools.js';
import { MULTIS, ZONE1, ZONE2, ZONE3 } from '../config.js';

/**
 * Séquence 36.
 * Traduction de `(sequence-36 deb fin)`, lignes 4633 à 4689.
 * @param {import('../../../core/score.js').Score} score Partition où écrire.
 * @param {import('../../../core/generators.js').GenLike} deb Début (noires), tiré une fois.
 * @param {import('../../../core/generators.js').GenLike} fin Fin (noires), tirée une fois.
 * @returns {void}
 */
export function sequence36(score, deb, fin) {
  printDialog(score, 'SEQUENCE 36');
  // prog-change
  placeProg(score, 0, MULTIS.m2);
  placeTempo(score, 0, 60);
  const deb2 = once(deb);
  const fin2 = once(fin);
  // un peu d'oiseaux aléatoires
  prorythme(score, rnd(16, 31), add(deb2, h([0, 2, 4, 6, 7, 8, 10])), fin2,
    gnotes(),
    h([0, 4, 4, 6, 8, 8, 12]),
    selAl(4, [1 / 2], [1], [3 / 2], [3], [5]),
    rnd(69, 125),
    h([100, 70, 90, 80]));
  // phrase monocanal de percu-catagnet
  shareGen('n1', h([12, 13, 14, 15, 16, 17, 18]));
  prorythme(score, rep(h(ZONE1), useGen('n1')), 0, fin2,
    gnotes({ proba: h([1, 1, 1, 1, 1, 0]) }),
    h([0, 5, 9, 13]),
    concat([1 / 2], nconcat(sub(useGen('n1'), 2), [1 / 8]), [8]),
    rep(rnd(97, 125), h([1, 1, 1, 2, 3, 4])),
    h([60, 70, 80, 90, 100]));
  freeGen('n1');
  shareGen('n1', h([12, 13, 14, 15, 16, 17, 18]));
  prorythme(score, rep(h(ZONE2), useGen('n1')), add(deb2, h([0, 2, 4, 6, 7, 8, 10])), fin2,
    gnotes({ proba: h([1, 1, 1, 1, 1, 0]) }),
    h([0, 5, 9, 13]),
    concat([1 / 2], nconcat(sub(useGen('n1'), 2), [1 / 8]), [8]),
    rep(rnd(97, 125), h([1, 1, 1, 2, 3, 4])),
    h([60, 70, 80, 90, 100]));
  freeGen('n1');
  shareGen('n1', h([12, 13, 14, 15, 16, 17, 18]));
  prorythme(score, rep(h(ZONE3), useGen('n1')), add(deb2, h([0, 2, 4, 6, 7, 8, 10])), fin2,
    gnotes({ proba: h([1, 1, 1, 1, 1, 0]) }),
    h([0, 5, 9, 13]),
    concat([1 / 2], nconcat(sub(useGen('n1'), 2), [1 / 8]), [8]),
    rep(rnd(97, 125), h([1, 1, 1, 2, 3, 4])),
    h([60, 70, 80, 90, 100]));
  freeGen('n1');
  // phrase monocanal de catagnet
  shareGen('n1', h([12, 13, 14, 15, 16, 17, 18]));
  prorythme(score, rep(rnd(0, 15), h([1, 1, 1, 1, 2, 2, 3, 4])), add(deb2, h([0, 2, 4, 6, 7, 8, 10])), fin2,
    gnotes({ proba: h([1, 1, 1, 1, 1, 0]) }),
    h([0, 5, 9, 13]),
    concat([1 / 2], nconcat(sub(useGen('n1'), 2), [1 / 8]), [4]),
    rep(rnd(116, 121), h([1, 1, 1, 2, 3, 4])),
    h([60, 70, 80, 90, 100]));
  freeGen('n1');
}

/**
 * @file Séquence 27 (3' - 6').
 *
 * Généré par `npm run transpile` (transpiler/) depuis source/Gerland2013-4.lsp.
 * Ne pas modifier à la main : corriger le transpileur, puis régénérer.
 * tests/transpile.test.js vérifie que ce fichier est à jour.
 *
 * Commentaire d'origine :
 *     Séquence 27 (3' - 6')
 *     Guirro, oiseaux, triangle en deux coups, faux insectes
 *     version pour 16 points       Multi M8
 */

import { add, floo, gnotes, h, i, placeTempo, prorythme, rep, rnd, sel, seq } from '../../../core/index.js';
import { once, placeProg, printDialog } from '../tools.js';
import { GACCORD, GECAR, MULTIS, ZONE1, ZONE2, ZONE3 } from '../config.js';

/**
 * Séquence 27.
 * Traduction de `(sequence-27 deb fin)`, lignes 3704 à 3796.
 * @param {import('../../../core/score.js').Score} score Partition où écrire.
 * @param {import('../../../core/generators.js').GenLike} deb Début (noires), tiré une fois.
 * @param {import('../../../core/generators.js').GenLike} fin Fin (noires), tirée une fois.
 * @returns {void}
 */
export function sequence27(score, deb, fin) {
  printDialog(score, 'SEQUENCE 27');
  // prog-change
  placeProg(score, 0, MULTIS.m8);
  placeTempo(score, 0, 60);
  const deb2 = once(deb);
  const fin2 = once(fin);
  //
  prorythme(score, rep(add(16, h(ZONE1)), h([2, 3, 4, 5, 6])), add(deb2, h([0, 1 / 8, 1 / 16, 1 / 2, 1, 1 / 4, 3 / 2])), fin2,
    gnotes(),
    sel(floo(i(5, 0)), 1, 2, 3, 4, 5, 6),
    [1 / 2],
    77,
    70);
  prorythme(score, rep(add(16, h(ZONE1)), h([2, 3, 4, 5, 6])), add(deb2, h([0, 1 / 8, 1 / 16, 1 / 2, 1, 1 / 4, 3 / 2])), fin2,
    gnotes(),
    sel(floo(i(5, 0)), 1, 2, 3, 4, 5, 6),
    [1 / 2],
    81,
    80);
  prorythme(score, rep(add(16, h(ZONE2)), h([2, 3, 4, 5, 6])), add(10, deb2, h([0, 1 / 8, 1 / 16, 1 / 2, 1, 1 / 4, 3 / 2])), fin2,
    gnotes(),
    sel(floo(i(5, 0)), 1, 2, 3, 4, 5, 6),
    [1 / 2],
    81,
    80);
  prorythme(score, rep(add(16, h(ZONE2)), h([2, 3, 4, 5, 6])), add(deb2, h([0, 1 / 8, 1 / 16, 1 / 2, 1, 1 / 4, 3 / 2])), fin2,
    gnotes(),
    sel(floo(i(5, 0)), 1, 2, 3, 4, 5, 6),
    sel(h([0, 0, 1]), [1 / 2], [3 / 2]),
    84,
    100);
  prorythme(score, rep(add(16, h(ZONE2)), h([2, 3, 4, 5, 6])), add(deb2, h([0, 1 / 8, 1 / 16, 1 / 2, 1, 1 / 4, 3 / 2])), fin2,
    gnotes(),
    sel(floo(i(5, 0)), 1, 2, 3, 4, 5, 6),
    sel(h([0, 0, 1]), [1 / 2], [3 / 2]),
    80,
    80);
  prorythme(score, rep(add(16, h(ZONE3)), h([2, 3, 4, 5, 6])), add(deb2, h([0, 1 / 8, 1 / 16, 1 / 2, 1, 1 / 4, 3 / 2])), fin2,
    gnotes(),
    sel(floo(i(5, 0)), 1, 2, 3, 4, 5, 6),
    [1 / 2],
    77,
    60);
  prorythme(score, rep(add(16, h(ZONE3)), h([2, 3, 4, 5, 6])), add(deb2, h([0, 1 / 8, 1 / 16, 1 / 2, 1, 1 / 4, 3 / 2])), fin2,
    gnotes(),
    sel(floo(i(5, 0)), 1, 2, 3, 4, 5, 6),
    [1 / 2],
    77,
    60);
  // faux insectes, rep 2 fois
  prorythme(score, rep(rnd(0, 15), 2), deb2, fin2,
    gnotes(),
    seq(h([0, 1, 15 / 2, 3]), h([0, 0, 1, 2])),
    [1 / 4, 1],
    rnd(84, 125),
    h([60, 70, 80]));
  prorythme(score, rep(rnd(0, 15), 2), add(6, deb2), fin2,
    gnotes(),
    h([0, 1, 15 / 2, 3]),
    [1 / 4, 1],
    rnd(84, 125),
    h([60, 70, 80]));
  // triangle, rep 2 fois
  prorythme(score, rep(rnd(0, 15), 2), deb2, fin2,
    gnotes(),
    h([0, 1, 15 / 2, 3, 4, 5]),
    [1 / 4, 1],
    rnd(45, 83),
    50);
  // fond general court pseudo-nuit  proba 1/2
  prorythme(score, 16, deb2, fin2,
    gnotes({ laccord: GACCORD, lecar: GECAR, proba: h([1, 1, 0]) }),
    h([12, 16, 24]),
    h([[4], [6], [8], [12], [10], [14]]),
    rnd(52, 54),
    45);
}

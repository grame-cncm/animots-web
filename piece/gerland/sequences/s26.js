/**
 * @file Séquence 26 (3' - 6').
 *
 * Généré par `npm run transpile` (transpiler/) depuis source/Gerland2013-4.lsp.
 * Ne pas modifier à la main : corriger le transpileur, puis régénérer.
 * tests/transpile.test.js vérifie que ce fichier est à jour.
 *
 * Commentaire d'origine :
 *     Séquence 26 (3' - 6')
 *     Guirro généralisé
 *     version pour 16 points       Multi M4
 *     avec faux insectes, rep 2 fois
 */

import { add, floo, gnotes, h, i, placeTempo, prorythme, rep, rnd, sel, seq } from '../../../core/index.js';
import { once, placeProg, printDialog } from '../tools.js';
import { GACCORD, GECAR, MULTIS } from '../config.js';

/**
 * Séquence 26.
 * Traduction de `(sequence-26 deb fin)`, lignes 3592 à 3685.
 * @param {import('../../../core/score.js').Score} score Partition où écrire.
 * @param {import('../../../core/generators.js').GenLike} deb Début (noires), tiré une fois.
 * @param {import('../../../core/generators.js').GenLike} fin Fin (noires), tirée une fois.
 * @returns {void}
 */
export function sequence26(score, deb, fin) {
  printDialog(score, 'SEQUENCE 26');
  // prog-change
  placeProg(score, 0, MULTIS.m4);
  placeTempo(score, 0, 60);
  const deb2 = once(deb);
  const fin2 = once(fin);
  //
  prorythme(score, rep(rnd(16, 31), h([2, 3, 4, 5, 6])), add(deb2, h([0, 1 / 8, 1 / 16, 1 / 2, 1, 1 / 4, 3 / 2])), fin2,
    gnotes(),
    sel(floo(i(5, 0)), 0, 1, 2, 3, 4, 5),
    [1 / 2],
    77,
    60);
  prorythme(score, rep(rnd(16, 31), h([2, 3, 4, 5, 6])), add(deb2, h([0, 1 / 8, 1 / 16, 1 / 2, 1, 1 / 4, 3 / 2])), fin2,
    gnotes(),
    sel(floo(i(5, 0)), 0, 1, 2, 3, 4, 5),
    [1 / 2],
    77,
    30);
  prorythme(score, rep(rnd(16, 31), h([2, 3, 4, 5, 6])), add(deb2, h([0, 1 / 8, 1 / 16, 1 / 2, 1, 1 / 4, 3 / 2])), fin2,
    gnotes(),
    sel(floo(i(5, 0)), 0, 1, 2, 3, 4, 5),
    [1 / 2],
    77,
    40);
  prorythme(score, rep(rnd(16, 31), h([2, 3, 4, 5, 6])), add(deb2, h([0, 1 / 8, 1 / 16, 1 / 2, 1, 1 / 4, 3 / 2])), fin2,
    gnotes(),
    sel(floo(i(5, 0)), 0, 1, 2, 3, 4, 5),
    [1 / 2],
    77,
    60);
  prorythme(score, rep(rnd(16, 31), h([2, 3, 4, 5, 6])), add(deb2, h([0, 1 / 8, 1 / 16, 1 / 2, 1, 1 / 4, 3 / 2])), fin2,
    gnotes(),
    sel(floo(i(5, 0)), 0, 1, 2, 3, 4, 5),
    [1 / 2],
    77,
    70);
  prorythme(score, rep(rnd(16, 31), h([2, 3, 4, 5, 6])), add(deb2, h([0, 1 / 8, 1 / 16, 1 / 2, 1, 1 / 4, 3 / 2])), fin2,
    gnotes(),
    sel(floo(i(5, 0)), 0, 1, 2, 3, 4, 5),
    [1 / 2],
    77,
    60);
  prorythme(score, rep(rnd(16, 31), h([2, 3, 4, 5, 6])), add(deb2, h([0, 1 / 8, 1 / 16, 1 / 2, 1, 1 / 4, 3 / 2])), fin2,
    gnotes(),
    sel(floo(i(5, 0)), 0, 1, 2, 3, 4, 5),
    [1 / 2],
    77,
    60);
  prorythme(score, rep(rnd(16, 31), h([2, 3, 4, 5, 6])), add(deb2, h([0, 1 / 8, 1 / 16, 1 / 2, 1, 1 / 4, 3 / 2])), fin2,
    gnotes(),
    sel(floo(i(5, 0)), 0, 1, 2, 3, 4, 5),
    [1 / 2],
    77,
    70);
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
    h([0, 1, 15 / 2, 3, 5]),
    [1 / 4, 1],
    rnd(33, 83),
    60);
  // fond general court pseudo-nuit  proba 2/3
  prorythme(score, 16, deb2, fin2,
    gnotes({ laccord: GACCORD, lecar: GECAR, proba: h([1, 1, 0]) }),
    h([12, 16, 24]),
    h([[4], [6], [8], [10], [12]]),
    rnd(51, 54),
    45);
}

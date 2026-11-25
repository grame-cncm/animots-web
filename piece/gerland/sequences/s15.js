/**
 * @file Séquence 15 (3' - 8').
 *
 * Généré par `npm run transpile` (transpiler/) depuis source/Gerland2013-4.lsp.
 * Ne pas modifier à la main : corriger le transpileur, puis régénérer.
 * tests/transpile.test.js vérifie que ce fichier est à jour.
 *
 * Commentaire d'origine :
 *     Séquence 15 (3' - 8')
 *     Gouttes 0       Multi M5
 *     version pour 16 points
 *     goutte aigüe
 *     note longue (ou moins longue) et aigüe rare
 */

import { add, concat, div, floo, gnotes, h, i, lst, placeTempo, prorythme, rnd, sel } from '../../../core/index.js';
import { once, placeProg, printDialog } from '../tools.js';
import { GACCORD, GECAR, MULTIS } from '../config.js';

/**
 * Séquence 15.
 * Traduction de `(sequence-15 deb fin)`, lignes 2399 à 2543.
 * @param {import('../../../core/score.js').Score} score Partition où écrire.
 * @param {import('../../../core/generators.js').GenLike} deb Début (noires), tiré une fois.
 * @param {import('../../../core/generators.js').GenLike} fin Fin (noires), tirée une fois.
 * @returns {void}
 */
export function sequence15(score, deb, fin) {
  printDialog(score, 'SEQUENCE 15');
  // prog-change
  placeProg(score, 0, MULTIS.m5);
  placeTempo(score, 0, 60);
  const deb2 = once(deb);
  const fin2 = once(fin);
  // goutte aigüe
  prorythme(score, 16, add(deb2, h([0, 1 / 2, 1, 1 / 4, 3 / 2])), fin2,
    gnotes(),
    sel(floo(i(5, 0)), 0, 1, 2, 3, 4, 5),
    [1 / 2],
    77,
    80);
  prorythme(score, 17, add(deb2, h([0, 1 / 2, 1, 1 / 4, 3 / 2])), fin2,
    gnotes(),
    sel(floo(i(5, 0)), 1, 2, 3, 4, 5, 6),
    [1 / 2],
    77,
    80);
  prorythme(score, 18, add(deb2, h([0, 1 / 2, 1, 1 / 4, 3 / 2])), fin2,
    gnotes(),
    sel(floo(i(5, 0)), 2, 3, 4, 5, 6, 7),
    [1 / 2],
    77,
    80);
  prorythme(score, 19, add(deb2, h([0, 1 / 2, 1, 1 / 4, 3 / 2])), fin2,
    gnotes(),
    sel(floo(i(5, 0)), 3, 4, 5, 6, 7, 8),
    [1 / 2],
    77,
    80);
  prorythme(score, 20, add(deb2, h([0, 1 / 2, 1, 1 / 4, 3 / 2])), fin2,
    gnotes(),
    sel(floo(i(5, 0)), 4, 5, 6, 7, 8, 9),
    [1 / 2],
    77,
    80);
  prorythme(score, 21, add(deb2, h([0, 1 / 2, 1, 1 / 4, 3 / 2])), fin2,
    gnotes(),
    sel(floo(i(5, 0)), 5, 6, 7, 8, 9, 10),
    [1 / 2],
    77,
    80);
  prorythme(score, 22, add(deb2, h([0, 1 / 2, 1, 1 / 4, 3 / 2])), fin2,
    gnotes(),
    sel(floo(i(5, 0)), 5, 6, 7, 8, 9, 10),
    [1 / 2],
    77,
    80);
  prorythme(score, 23, add(deb2, h([0, 1 / 2, 1, 1 / 4, 3 / 2])), fin2,
    gnotes(),
    sel(floo(i(5, 0)), 5, 6, 7, 8, 9, 10),
    [1 / 2],
    77,
    80);
  prorythme(score, 24, add(deb2, h([0, 1 / 2, 1, 1 / 4, 3 / 2])), fin2,
    gnotes(),
    sel(floo(i(5, 0)), 5, 6, 7, 8, 9, 10),
    [1 / 2],
    77,
    80);
  prorythme(score, 25, add(deb2, h([0, 1 / 2, 1, 1 / 4, 3 / 2])), fin2,
    gnotes(),
    sel(floo(i(5, 0)), 5, 6, 7, 8, 9, 10),
    [1 / 2],
    77,
    80);
  prorythme(score, 26, add(deb2, h([0, 1 / 2, 1, 1 / 4, 3 / 2])), fin2,
    gnotes(),
    sel(floo(i(5, 0)), 5, 6, 7, 8, 9, 10),
    [1 / 2],
    77,
    80);
  prorythme(score, 27, add(deb2, h([0, 1 / 2, 1, 1 / 4, 3 / 2])), fin2,
    gnotes(),
    sel(floo(i(5, 0)), 5, 6, 7, 8, 9, 10),
    [1 / 2],
    77,
    80);
  prorythme(score, 28, add(deb2, h([0, 1 / 2, 1, 1 / 4, 3 / 2])), fin2,
    gnotes(),
    sel(floo(i(5, 0)), 5, 6, 7, 8, 9, 10),
    [1 / 2],
    77,
    80);
  prorythme(score, 29, add(deb2, h([0, 1 / 2, 1, 1 / 4, 3 / 2])), fin2,
    gnotes(),
    sel(floo(i(5, 0)), 5, 6, 7, 8, 9, 10),
    [1 / 2],
    77,
    80);
  prorythme(score, 30, add(deb2, h([0, 1 / 2, 1, 1 / 4, 3 / 2])), fin2,
    gnotes(),
    sel(floo(i(5, 0)), 5, 6, 7, 8, 9, 10),
    [1 / 2],
    77,
    80);
  prorythme(score, 31, add(deb2, h([0, 1 / 2, 1, 1 / 4, 3 / 2])), fin2,
    gnotes(),
    sel(floo(i(5, 0)), 5, 6, 7, 8, 9, 10),
    [1 / 2],
    77,
    80);
  // fond general court pseudo-nuit  proba 1/2
  prorythme(score, 16, deb2, fin2,
    gnotes({ laccord: GACCORD, lecar: GECAR, proba: h([1, 1, 0]) }),
    h([8, 16, 24]),
    h([[8], [12]]),
    52,
    70);
  // note longue et aigüe rare
  prorythme(score, 16, deb2, fin2,
    gnotes({ laccord: concat(lst(rnd(0, 15)), lst(rnd(0, 15)), lst(rnd(0, 15))), lecar: [0, 0, 0] }),
    h([0, 1, 15 / 2, 3]),
    h([[16], [8]]),
    rnd(79, 95),
    80);
  // note moins longue et aigüe rare
  prorythme(score, rnd(16, 31), deb2, fin2,
    gnotes(),
    h([0, 1, 15 / 2, 3]),
    h([[2], [5], [8]]),
    rnd(79, 95),
    80);
  // note moins longue et aigüe rare, plus tard
  prorythme(score, rnd(16, 31), floo(div(fin2, 2)), fin2,
    gnotes(),
    h([0, 1, 15 / 2, 3]),
    [1 / 4, 1],
    rnd(79, 95),
    90);
}

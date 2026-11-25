/**
 * @file Séquence 16 (3' - 6').
 *
 * Généré par `npm run transpile` (transpiler/) depuis source/Gerland2013-4.lsp.
 * Ne pas modifier à la main : corriger le transpileur, puis régénérer.
 * tests/transpile.test.js vérifie que ce fichier est à jour.
 *
 * Commentaire d'origine :
 *     Séquence 16 (3' - 6')
 *     Gouttes 1        Multi M5
 *     version pour 16 points
 *     goutte aigüe même rythme
 *     note moins longue (ou moins longue) et aigüe rare, rep 2 fois
 *     percu, répétée 2 fois
 */

import { add, dif, div, floo, gnotes, h, i, placeTempo, prorythme, rep, rnd, sel, sub } from '../../../core/index.js';
import { once, placeProg, printDialog } from '../tools.js';
import { GACCORD, GECAR, MULTIS } from '../config.js';

/**
 * Séquence 16.
 * Traduction de `(sequence-16 deb fin)`, lignes 2566 à 2656.
 * @param {import('../../../core/score.js').Score} score Partition où écrire.
 * @param {import('../../../core/generators.js').GenLike} deb Début (noires), tiré une fois.
 * @param {import('../../../core/generators.js').GenLike} fin Fin (noires), tirée une fois.
 * @returns {void}
 */
export function sequence16(score, deb, fin) {
  printDialog(score, 'SEQUENCE 16');
  // prog-change
  placeProg(score, 0, MULTIS.m5);
  placeTempo(score, 0, 60);
  const deb2 = once(deb);
  const fin2 = once(fin);
  // goutte aigüe même rythme
  prorythme(score, rep(rnd(16, 31), h([2, 4, 6])), add(deb2, h([0, 1 / 2, 1, 1 / 4, 3 / 2])), fin2,
    gnotes(),
    sel(floo(i(5, 0)), 0, 1, 2, 3, 4, 5),
    [1 / 2],
    77,
    90);
  prorythme(score, rep(rnd(16, 31), h([2, 4, 6])), add(deb2, h([0, 1 / 2, 1, 1 / 4, 3 / 2])), fin2,
    gnotes(),
    sel(floo(i(5, 0)), 0, 1, 2, 3, 4, 5),
    [1 / 2],
    77,
    90);
  prorythme(score, rep(rnd(16, 31), h([2, 4, 6])), add(deb2, h([0, 1 / 2, 1, 1 / 4, 3 / 2])), fin2,
    gnotes(),
    sel(floo(i(5, 0)), 0, 1, 2, 3, 4, 5),
    [1 / 2],
    77,
    90);
  prorythme(score, rep(rnd(16, 31), h([2, 4, 6])), add(deb2, h([0, 1 / 2, 1, 1 / 4, 3 / 2])), fin2,
    gnotes(),
    sel(floo(i(5, 0)), 0, 1, 2, 3, 4, 5),
    [1 / 2],
    77,
    90);
  prorythme(score, rep(rnd(16, 31), h([2, 4, 6])), add(deb2, h([0, 1 / 2, 1, 1 / 4, 3 / 2])), fin2,
    gnotes(),
    sel(floo(i(5, 0)), 0, 1, 2, 3, 4, 5),
    [1 / 2],
    77,
    90);
  prorythme(score, rep(rnd(16, 31), h([2, 4, 6])), add(deb2, h([0, 1 / 2, 1, 1 / 4, 3 / 2])), fin2,
    gnotes(),
    sel(floo(i(5, 0)), 0, 1, 2, 3, 4, 5),
    [1 / 2],
    77,
    90);
  // fond general court pseudo-nuit  proba 1/2
  prorythme(score, 16, deb2, sub(fin2, 60),
    gnotes({ laccord: GACCORD, lecar: GECAR, proba: h([1, 1, 0]) }),
    h([15, 8, 4, 10]),
    h([[10], [6], [8], [7]]),
    dif(rnd(52, 54)),
    70);
  // note moins longue et aigüe rare, rep 2 fois
  prorythme(score, rep(rnd(16, 31), 2), floo(div(fin2, 2)), fin2,
    gnotes(),
    h([0, 1, 15 / 2, 3]),
    [1 / 4, 1],
    rnd(79, 95),
    90);
  // note moins longue et aigüe rare, rep 2 fois
  prorythme(score, rep(rnd(16, 31), 2), floo(div(fin2, 2)), fin2,
    gnotes(),
    h([0, 1, 15 / 2, 3]),
    [1 / 4, 1],
    rnd(79, 95),
    90);
  // rep 2 fois
  prorythme(score, rep(rnd(0, 15), 2), deb2, fin2,
    gnotes(),
    h([0, 1, 15 / 2, 3]),
    [1 / 4, 2],
    rnd(21, 68),
    80);
  // percu, répétée 2 fois
  prorythme(score, rep(rnd(0, 15), 2), add(6, deb2), fin2,
    gnotes(),
    h([0, 1, 15 / 2, 3]),
    [1 / 8, 1],
    rnd(69, 96),
    90);
}

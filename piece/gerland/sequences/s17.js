/**
 * @file Séquence 17 (2' - 5') --------> cette séquence n'est plus jouée (5-11-2013).
 *
 * Généré par `npm run transpile` (transpiler/) depuis source/Gerland2013-4.lsp.
 * Ne pas modifier à la main : corriger le transpileur, puis régénérer.
 * tests/transpile.test.js vérifie que ce fichier est à jour.
 *
 * Commentaire d'origine :
 *     Séquence 17 (2' - 5') --------> cette séquence n'est plus jouée (5-11-2013)
 *     OUI et Non avec trainées aigüe       Multi M5
 *     version pour 16 points
 *     voix et notes répétée
 */

import { add, div, floo, gnotes, h, hs, i, mult, placeTempo, prorythme, rep, rnd, sel, sub } from '../../../core/index.js';
import { nconcatSpe4, once, placeProg, printDialog } from '../tools.js';
import { GACCORD, GECAR, MULTIS, ZONE1, ZONE2, ZONE3 } from '../config.js';

/**
 * Séquence 17.
 * Traduction de `(sequence-17 deb fin)`, lignes 2680 à 2823.
 * @param {import('../../../core/score.js').Score} score Partition où écrire.
 * @param {import('../../../core/generators.js').GenLike} deb Début (noires), tiré une fois.
 * @param {import('../../../core/generators.js').GenLike} fin Fin (noires), tirée une fois.
 * @returns {void}
 */
export function sequence17(score, deb, fin) {
  printDialog(score, 'SEQUENCE 17');
  // prog-change
  placeProg(score, 0, MULTIS.m5);
  placeTempo(score, 0, 60);
  const deb2 = once(deb);
  const fin2 = once(fin);
  // voix répétée
  prorythme(score, 16, add(deb2, h([0, 1 / 2, 1, 1 / 4, 3 / 2])), floo(mult(fin2, 0.8)),
    gnotes(
      { laccord: rep(nconcatSpe4(3, hs([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])), h([2, 4, 6])), lecar: [0, 0, 0] }),
    sel(floo(i(5, 0)), 0, 1, 2, 3, 4, 5),
    [1 / 2],
    rep(h([37, 50]), 20),
    60);
  prorythme(score, 16, floo(mult(fin2, 0.8)), fin2,
    gnotes(
      { laccord: rep(nconcatSpe4(3, hs([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])), h([2, 4, 6])), lecar: [0, 0, 0] }),
    5,
    [1 / 2],
    rep(h([37, 50]), 20),
    60);
  // note répétée
  // zone1
  prorythme(score, rep(add(16, h(ZONE1)), h([2, 4, 6])), add(deb2, h([0, 1 / 2, 1, 1 / 4, 3 / 2])), floo(mult(fin2, 0.8)),
    gnotes(),
    sel(floo(i(5, 0)), 0, 1, 2, 3, 4, 5),
    [1 / 2],
    80,
    100);
  prorythme(score, rep(add(16, h(ZONE1)), h([2, 4, 6])), floo(mult(fin2, 0.8)), fin2,
    gnotes(),
    5,
    [1 / 2],
    80,
    100);
  // note répétée
  // zone1
  prorythme(score, rep(add(16, h(ZONE1)), h([2, 4, 6])), add(deb2, h([0, 1 / 2, 1, 1 / 4, 3 / 2])), floo(mult(fin2, 0.8)),
    gnotes(),
    sel(floo(i(5, 0)), 0, 1, 2, 3, 4, 5),
    [1 / 2],
    77,
    100);
  prorythme(score, rep(add(16, h(ZONE1)), h([2, 4, 6])), floo(mult(fin2, 0.8)), fin2,
    gnotes(),
    5,
    [1 / 2],
    77,
    100);
  // note répétée
  // zone2
  prorythme(score, rep(add(16, h(ZONE2)), h([2, 4, 6])), add(deb2, h([0, 1 / 2, 1, 1 / 4, 3 / 2])), floo(mult(fin2, 0.8)),
    gnotes(),
    sel(floo(i(5, 0)), 0, 1, 2, 3, 4, 5),
    [1 / 2],
    70,
    110);
  prorythme(score, rep(add(16, h(ZONE2)), h([2, 4, 6])), floo(mult(fin2, 0.8)), fin2,
    gnotes(),
    5,
    [1 / 2],
    70,
    110);
  // note répétée
  // zone2
  prorythme(score, rep(add(16, h(ZONE2)), h([2, 4, 6])), add(deb2, h([0, 1 / 2, 1, 1 / 4, 3 / 2])), floo(mult(fin2, 0.8)),
    gnotes(),
    sel(floo(i(5, 0)), 0, 1, 2, 3, 4, 5),
    [1 / 2],
    77,
    100);
  prorythme(score, rep(add(16, h(ZONE2)), h([2, 4, 6])), floo(mult(fin2, 0.8)), fin2,
    gnotes(),
    5,
    [1 / 2],
    77,
    100);
  // note répétée
  // zone3
  prorythme(score, rep(add(16, h(ZONE3)), h([2, 4, 6])), add(deb2, h([0, 1 / 2, 1, 1 / 4, 3 / 2])), floo(mult(fin2, 0.8)),
    gnotes(),
    sel(floo(i(5, 0)), 0, 1, 2, 3, 4, 5),
    [1 / 2],
    90,
    100);
  prorythme(score, rep(add(16, h(ZONE3)), h([2, 4, 6])), floo(mult(fin2, 0.8)), fin2,
    gnotes(),
    5,
    [1 / 2],
    90,
    100);
  // note répétée
  // zone3
  prorythme(score, rep(add(16, h(ZONE3)), h([2, 4, 6])), add(deb2, h([0, 1 / 2, 1, 1 / 4, 3 / 2])), floo(mult(fin2, 0.8)),
    gnotes(),
    sel(floo(i(5, 0)), 0, 1, 2, 3, 4, 5),
    [1 / 2],
    77,
    100);
  prorythme(score, rep(add(16, h(ZONE3)), h([2, 4, 6])), floo(mult(fin2, 0.8)), fin2,
    gnotes(),
    5,
    [1 / 2],
    77,
    100);
  // note moins longue et aigüe rare, rep 2 fois
  prorythme(score, rep(rnd(16, 31), 2), floo(div(fin2, 3)), fin2,
    gnotes(),
    h([0, 1, 15 / 2, 3]),
    [1 / 4, 1],
    rnd(79, 95),
    80);
  prorythme(score, rep(rnd(16, 31), 2), floo(mult(fin2, 0.8)), fin2,
    gnotes(),
    h([0, 1, 15 / 2, 3]),
    [1 / 4, 1],
    rnd(79, 95),
    80);
  // fond general court pseudo-nuit  proba 1/2
  prorythme(score, 16, deb2, sub(fin2, 60),
    gnotes({ laccord: GACCORD, lecar: GECAR, proba: h([1, 1, 0]) }),
    h([16, 24, 30, 50]),
    h([[4], [6], [8], [3]]),
    52,
    60);
}

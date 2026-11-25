/**
 * @file Séquence 18 (3' - 7').
 *
 * Généré par `npm run transpile` (transpiler/) depuis source/Gerland2013-4.lsp.
 * Ne pas modifier à la main : corriger le transpileur, puis régénérer.
 * tests/transpile.test.js vérifie que ce fichier est à jour.
 *
 * Commentaire d'origine :
 *     Séquence 18 (3' - 7')
 *     Petites gouttes à densité croissante
 *     version pour 16 points       Multi M5
 *     avec triangle
 *     avec faux insectes
 *     avec fond nuit
 */

import { add, floo, gnotes, h, i, placeTempo, prorythme, rep, rnd, sel, seq } from '../../../core/index.js';
import { once, placeProg, printDialog } from '../tools.js';
import { GACCORD, GECAR, MULTIS, ZONE1, ZONE2, ZONE3 } from '../config.js';

/**
 * Séquence 18.
 * Traduction de `(sequence-18 deb fin)`, lignes 2847 à 2956.
 * @param {import('../../../core/score.js').Score} score Partition où écrire.
 * @param {import('../../../core/generators.js').GenLike} deb Début (noires), tiré une fois.
 * @param {import('../../../core/generators.js').GenLike} fin Fin (noires), tirée une fois.
 * @returns {void}
 */
export function sequence18(score, deb, fin) {
  printDialog(score, 'SEQUENCE 18');
  // prog-change
  placeProg(score, 0, MULTIS.m5);
  placeTempo(score, 0, 60);
  const deb2 = once(deb);
  const fin2 = once(fin);
  // goutte aigüe même rythme
  prorythme(score, rep(rnd(16, 31), h([2, 3, 4, 5, 6])), add(deb2, h([0, 1 / 8, 1 / 16, 1 / 2, 1, 1 / 4, 3 / 2])), fin2,
    gnotes(),
    sel(floo(i(5, 0)), 0, 1, 2, 3, 4, 5),
    [1 / 2],
    77,
    97);
  prorythme(score, rep(rnd(16, 31), h([2, 3, 4, 5, 6])), add(deb2, h([0, 1 / 8, 1 / 16, 1 / 2, 1, 1 / 4, 3 / 2])), fin2,
    gnotes(),
    sel(floo(i(5, 0)), 0, 1, 2, 3, 4, 5),
    [1 / 2],
    81,
    70);
  prorythme(score, rep(rnd(16, 31), h([2, 3, 4, 5, 6])), add(10, deb2, h([0, 1 / 8, 1 / 16, 1 / 2, 1, 1 / 4, 3 / 2])), fin2,
    gnotes(),
    sel(floo(i(5, 0)), 0, 1, 2, 3, 4, 5),
    [1 / 2],
    81,
    70);
  prorythme(score, rep(rnd(16, 31), h([2, 3, 4, 5, 6])), add(deb2, h([0, 1 / 8, 1 / 16, 1 / 2, 1, 1 / 4, 3 / 2])), fin2,
    gnotes(),
    sel(floo(i(5, 0)), 0, 1, 2, 3, 4, 5),
    [1 / 2],
    84,
    100);
  prorythme(score, rep(rnd(16, 31), h([2, 3, 4, 5, 6])), add(deb2, h([0, 1 / 8, 1 / 16, 1 / 2, 1, 1 / 4, 3 / 2])), fin2,
    gnotes(),
    sel(floo(i(5, 0)), 0, 1, 2, 3, 4, 5),
    [1 / 2],
    80,
    90);
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
    90);
  prorythme(score, rep(rnd(16, 31), h([2, 3, 4, 5, 6])), add(deb2, h([0, 1 / 8, 1 / 16, 1 / 2, 1, 1 / 4, 3 / 2])), fin2,
    gnotes(),
    sel(floo(i(5, 0)), 0, 1, 2, 3, 4, 5),
    [1 / 2],
    77,
    97);
  prorythme(score, rep(rnd(16, 31), h([2, 3, 4, 5, 6])), add(deb2, h([0, 1 / 8, 1 / 16, 1 / 2, 1, 1 / 4, 3 / 2])), fin2,
    gnotes(),
    sel(floo(i(5, 0)), 0, 1, 2, 3, 4, 5),
    [1 / 2],
    77,
    97);
  // faux insectes, rep 2 fois
  // zone1
  prorythme(score, rep(h(ZONE1), 2), deb2, fin2,
    gnotes(),
    seq(h([0, 1, 15 / 2, 3]), h([0, 0, 1, 2])),
    [1 / 4, 1],
    rnd(84, 125),
    80);
  // zone2
  prorythme(score, rep(h(ZONE2), 2), add(6, deb2), fin2,
    gnotes(),
    h([0, 1, 15 / 2, 3]),
    [1 / 4, 1],
    rnd(84, 125),
    80);
  // zone3
  prorythme(score, rep(h(ZONE3), 2), add(6, deb2), fin2,
    gnotes(),
    h([0, 1, 15 / 2, 3]),
    [1 / 4, 1],
    rnd(84, 125),
    80);
  // triangle-cloche, rep 2 fois
  prorythme(score, rep(rnd(0, 15), 2), deb2, fin2,
    gnotes(),
    h([0, 1, 15 / 2, 3]),
    [1 / 4, 1],
    rnd(21, 83),
    50);
  // fond general court pseudo-nuit  proba 1/2
  prorythme(score, 16, deb2, fin2,
    gnotes({ laccord: GACCORD, lecar: GECAR, proba: h([1, 1, 0]) }),
    h([16, 20, 24, 30]),
    h([[4], [6], [8], [3]]),
    rnd(52, 54),
    90);
}

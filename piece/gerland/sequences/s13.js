/**
 * @file Séquence 13 (3' - 9').
 *
 * Généré par `npm run transpile` (transpiler/) depuis source/Gerland2013-4.lsp.
 * Ne pas modifier à la main : corriger le transpileur, puis régénérer.
 * tests/transpile.test.js vérifie que ce fichier est à jour.
 *
 * Commentaire d'origine :
 *     Séquence 13 (3' - 9')
 *     Cécilia et voix
 *     version pour 16 points       Multi M5
 *     avec cécilia long répétés
 *     avec cécilia aigus répétés
 *     avec voix répétées
 *     avec triangles aigus répétés
 */

import { add, concat, freeGen, gnotes, h, lst, nconcat, placeTempo, prorythme, rep, rnd, sel, shareGen, sub, t, useGen } from '../../../core/index.js';
import { once, placeProg, printDialog } from '../tools.js';
import { GACCORD, GECAR, MULTIS, ZONE1, ZONE2, ZONE3 } from '../config.js';

/**
 * Séquence 13.
 * Traduction de `(sequence-13 deb fin)`, lignes 2108 à 2272.
 * @param {import('../../../core/score.js').Score} score Partition où écrire.
 * @param {import('../../../core/generators.js').GenLike} deb Début (noires), tiré une fois.
 * @param {import('../../../core/generators.js').GenLike} fin Fin (noires), tirée une fois.
 * @returns {void}
 */
export function sequence13(score, deb, fin) {
  printDialog(score, 'SEQUENCE 13');
  // prog-change
  placeProg(score, 0, MULTIS.m5);
  placeTempo(score, 0, 60);
  const deb2 = once(deb);
  const fin2 = once(fin);
  // cécilia long répétés
  // (rnd °52 °60)
  prorythme(score, 16, deb2, fin2,
    gnotes(
      { laccord: concat(lst(rnd(0, 15)), lst(rnd(0, 15)), lst(rnd(0, 15)), lst(rnd(0, 15))), lecar: [0, 0, 0, 0] }),
    h([16, 18, 24]),
    sel(h([0, 1, 2, 2, 3, 3, 3, 4, 4, 4, 4]), [6], [8], [8], [10], [12]),
    rnd(61, 67),
    127);
  // cécilia aigus répétés
  // zone1
  shareGen('n1', h([3, 4, 5, 6, 7]));
  prorythme(score, rep(add(16, h(ZONE1)), useGen('n1')), add(deb2, h([1, 2, 3, 4, 5, 6, 7])), fin2,
    gnotes(),
    h([16, 8, 20]),
    concat(
      nconcat(
        sub(useGen('n1'), 1),
        rep(h([[1 / 8], [t('2/3dc', [1 / 4, 1 / 4, 1 / 4])], [1 / 4]]), sub(useGen('n1'), 1))),
      [10]),
    rep(rnd(74, 83), h([7, 14, 21])),
    100);
  freeGen('n1');
  // zone2
  shareGen('n1', h([3, 4, 5, 6, 7]));
  prorythme(score, rep(add(16, h(ZONE2)), useGen('n1')), add(deb2, h([1, 2, 3, 4, 5, 6, 7])), fin2,
    gnotes(),
    h([16, 8, 20]),
    concat(
      nconcat(
        sub(useGen('n1'), 1),
        rep(h([[1 / 8], [t('2/3dc', [1 / 4, 1 / 4, 1 / 4])], [1 / 4]]), sub(useGen('n1'), 1))),
      [10]),
    rep(rnd(74, 83), h([7, 14, 21])),
    100);
  freeGen('n1');
  // zone3
  shareGen('n1', h([3, 4, 5, 6, 7]));
  prorythme(score, rep(add(16, h(ZONE3)), useGen('n1')), add(deb2, h([1, 2, 3, 4, 5, 6, 7])), fin2,
    gnotes(),
    h([16, 8, 20]),
    concat(
      nconcat(
        sub(useGen('n1'), 1),
        rep(h([[1 / 8], [t('2/3dc', [1 / 4, 1 / 4, 1 / 4])], [1 / 4]]), sub(useGen('n1'), 1))),
      [10]),
    rep(rnd(74, 83), h([7, 14, 21])),
    100);
  freeGen('n1');
  // voix répétées
  // zone1
  shareGen('n1', h([3, 4, 5, 6, 7]));
  prorythme(score, sel(rep(h([0, 1]), useGen('n1')), rep(add(16, h(ZONE1)), useGen('n1')), add(16, h(ZONE1))), deb2, fin2,
    gnotes(),
    h([16, 32, 24, 32]),
    concat(
      nconcat(
        sub(useGen('n1'), 1),
        rep(h([[1], [3 / 2], [t('2/3b', [2, 2, 2])], [2], [3]]), sub(useGen('n1'), 1))),
      [10]),
    rep(rnd(21, 50), h([7, 14, 21])),
    60);
  freeGen('n1');
  // zone2
  shareGen('n1', h([3, 4, 5, 6, 7]));
  prorythme(score, sel(rep(h([0, 1]), useGen('n1')), rep(add(16, h(ZONE2)), useGen('n1')), add(16, h(ZONE2))), add(deb2, h([2, 3, 4, 5])), fin2,
    gnotes(),
    h([16, 32, 24, 32]),
    concat(
      nconcat(
        sub(useGen('n1'), 1),
        rep(h([[1], [3 / 2], [t('2/3b', [2, 2, 2])], [2], [3]]), sub(useGen('n1'), 1))),
      [10]),
    rep(rnd(21, 50), h([7, 14, 21])),
    60);
  freeGen('n1');
  // zone3
  shareGen('n1', h([3, 4, 5, 6, 7]));
  prorythme(score, sel(rep(h([0, 1]), useGen('n1')), rep(add(16, h(ZONE3)), useGen('n1')), add(16, h(ZONE3))), add(deb2, h([5, 6, 7, 8, 9, 10])), fin2,
    gnotes(),
    h([16, 32, 24, 32]),
    concat(
      nconcat(
        sub(useGen('n1'), 1),
        rep(h([[1], [3 / 2], [t('2/3b', [2, 2, 2])], [2], [3]]), sub(useGen('n1'), 1))),
      [10]),
    rep(rnd(21, 50), h([7, 14, 21])),
    60);
  freeGen('n1');
  // fond général pseudo-nuit synchro  proba 1/2
  prorythme(score, 16, deb2, fin2,
    gnotes({ laccord: GACCORD, lecar: GECAR, proba: h([1, 0]) }),
    h([0, 8, 16, 24, 30, 32]),
    h([[8], [16], [24], [32]]),
    rnd(52, 54),
    60);
  // triangles aigus répétés
  shareGen('n1', h([3, 4, 5, 6, 7]));
  prorythme(score, rep(rnd(0, 15), useGen('n1')), deb2, fin2,
    gnotes({ stac: 8 }),
    h([16, 8, 24]),
    concat(
      nconcat(
        sub(useGen('n1'), 1),
        rep(h([[1 / 8], [t('2/3dc', [1 / 4, 1 / 4, 1 / 4])], [1 / 4]]), sub(useGen('n1'), 1))),
      [10]),
    rep(rnd(76, 83), h([7, 14, 21])),
    110);
  freeGen('n1');
  // gouttes cécilia aigus répétés
  shareGen('n1', h([3, 4, 5, 6, 7]));
  prorythme(score, rep(rnd(16, 31), useGen('n1')), deb2, fin2,
    gnotes(),
    h([8, 4, 16, 32, 24]),
    concat(
      nconcat(
        sub(useGen('n1'), 1),
        rep(h([[1 / 8], [t('2/3dc', [1 / 4, 1 / 4, 1 / 4])], [1 / 4]]), sub(useGen('n1'), 1))),
      [10]),
    rep(rnd(79, 85), h([7, 14, 21])),
    90);
  freeGen('n1');
  // fond général Rivière (proba 1/3)
  prorythme(score, 0, deb2, fin2,
    gnotes({ laccord: GACCORD, lecar: GECAR, proba: h([1]) }),
    24,
    [48],
    rnd(126, 127),
    80);
}

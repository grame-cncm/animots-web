/**
 * @file Séquence 7 (4' - 8').
 *
 * Généré par `npm run transpile` (transpiler/) depuis source/Gerland2013-4.lsp.
 * Ne pas modifier à la main : corriger le transpileur, puis régénérer.
 * tests/transpile.test.js vérifie que ce fichier est à jour.
 *
 * Commentaire d'origine :
 *     Séquence 7 (4' - 8')
 *     Percu
 *     version pour 16 points         Multi M2
 *     avec insectes aléatoire
 *     avec phrase monocanal de percu castagnet
 *     avec un peu de "tenu" brèves aléatoires
 *     avec un peu de guiro aléatoire
 */

import { add, concat, freeGen, gnotes, h, nconcat, placeTempo, prorythme, rep, rnd, shareGen, sub, t, useGen } from '../../../core/index.js';
import { once, placeProg, printDialog, selAl, xconcat } from '../tools.js';
import { GACCORD_DEMI, GECAR, MULTIS, ZONE1, ZONE2, ZONE3 } from '../config.js';

/**
 * Séquence 7.
 * Traduction de `(sequence-7 deb fin)`, lignes 1435 à 1533.
 * @param {import('../../../core/score.js').Score} score Partition où écrire.
 * @param {import('../../../core/generators.js').GenLike} deb Début (noires), tiré une fois.
 * @param {import('../../../core/generators.js').GenLike} fin Fin (noires), tirée une fois.
 * @returns {void}
 */
export function sequence7(score, deb, fin) {
  printDialog(score, 'SEQUENCE 7');
  // prog-change
  placeProg(score, 0, MULTIS.m2);
  placeTempo(score, 0, 60);
  const deb2 = once(deb);
  const fin2 = once(fin);
  // insectes oiseaux aléatoires un peu répétés
  // zone1
  shareGen('n1', h([1, 2, 2, 2, 2, 3, 3, 3, 4, 5]));
  prorythme(score, rep(add(16, h(ZONE1)), useGen('n1')), add(deb2, h([0, 1, 2, 4, 6, 7, 8, 10])), fin2,
    gnotes(),
    h([4, 8, 12, 20]),
    xconcat(useGen('n1'), selAl(3, [1 / 4], [1 / 2], [3], [5])),
    rep(rnd(69, 125), useGen('n1')),
    rep(h([100, 70, 90, 80]), useGen('n1')));
  freeGen('n1');
  // zone2
  shareGen('n1', h([1, 2, 2, 2, 2, 3, 3, 3, 4, 5]));
  prorythme(score, rep(add(16, h(ZONE2)), useGen('n1')), add(deb2, h([0, 1, 2, 4, 6, 7, 8, 10])), fin2,
    gnotes(),
    h([4, 8, 12, 20]),
    xconcat(useGen('n1'), selAl(3, [1 / 4], [1 / 2], [3], [5])),
    rep(rnd(69, 125), useGen('n1')),
    rep(h([100, 70, 90, 80]), useGen('n1')));
  freeGen('n1');
  // zone3
  shareGen('n1', h([1, 2, 2, 2, 2, 3, 3, 3, 4, 5]));
  prorythme(score, rep(add(16, h(ZONE3)), useGen('n1')), add(deb2, h([0, 1, 2, 4, 6, 7, 8, 10])), fin2,
    gnotes(),
    h([4, 8, 12, 20]),
    xconcat(useGen('n1'), selAl(3, [1 / 4], [1 / 2], [3], [5])),
    rep(rnd(69, 125), useGen('n1')),
    rep(h([100, 70, 90, 80]), useGen('n1')));
  freeGen('n1');
  // phrase monocanal de percu
  // zone1
  shareGen('n1', h([4, 6, 8, 12, 13, 14, 15, 16, 17, 18]));
  prorythme(score, rep(h(ZONE1), useGen('n1')), deb2, fin2,
    gnotes({ proba: h([1, 1, 1, 1, 1, 0]) }),
    h([5, 9, 13]),
    selAl(
      1,
      concat([1 / 2], nconcat(sub(useGen('n1'), 2), [1 / 8]), [4]),
      concat(
        [1 / 2],
        [1 / 2],
        [2],
        nconcat(sub(useGen('n1'), 2), selAl(1, [1 / 8], [t('2/3dc', [1 / 4, 1 / 4, 1 / 4])])),
        [4])),
    rep(rnd(69, 96), h([1, 1, 1, 2, 3])),
    90);
  freeGen('n1');
  // zone2
  shareGen('n1', h([4, 6, 8, 12, 13, 14, 15, 16, 17, 18]));
  prorythme(score, rep(h(ZONE2), useGen('n1')), deb2, fin2,
    gnotes({ proba: h([1, 1, 1, 1, 1, 0]) }),
    h([5, 9, 13]),
    selAl(
      1,
      concat([1 / 2], nconcat(sub(useGen('n1'), 2), [1 / 8]), [4]),
      concat(
        [1 / 2],
        [1 / 2],
        [2],
        nconcat(sub(useGen('n1'), 2), selAl(1, [1 / 8], [t('2/3dc', [1 / 4, 1 / 4, 1 / 4])])),
        [4])),
    rep(rnd(69, 96), h([1, 1, 1, 2, 3])),
    90);
  freeGen('n1');
  // zone3
  shareGen('n1', h([4, 6, 8, 12, 13, 14, 15, 16, 17, 18]));
  prorythme(score, rep(h(ZONE3), useGen('n1')), deb2, fin2,
    gnotes({ proba: h([1, 1, 1, 1, 1, 0]) }),
    h([5, 9, 13]),
    selAl(
      1,
      concat([1 / 2], nconcat(sub(useGen('n1'), 2), [1 / 8]), [4]),
      concat(
        [1 / 2],
        [1 / 2],
        [2],
        nconcat(sub(useGen('n1'), 2), selAl(1, [1 / 8], [t('2/3dc', [1 / 4, 1 / 4, 1 / 4])])),
        [4])),
    rep(rnd(69, 96), h([1, 1, 1, 2, 3])),
    90);
  freeGen('n1');
  // un peu de "tenu" jour / nuit brèves aléatoires
  prorythme(score, 16, add(deb2, h([0, 1, 2, 4, 6, 7, 8, 10])), fin2,
    gnotes({ laccord: GACCORD_DEMI, lecar: GECAR }),
    h([4, 6, 8, 8, 12, 24]),
    selAl(5, [3], [1], [2], [8], [4], [7]),
    rnd(21, 68),
    h([60, 70, 50, 80]));
  // un peu de guiro aléatoire
  prorythme(score, rnd(0, 15), add(deb2, h([0, 1, 2, 4, 6, 7, 8, 10])), fin2,
    gnotes(),
    h([0, 4, 4, 6, 8, 8]),
    selAl(5, [3], [1 / 2], [1], [3 / 2], [3], [5]),
    rnd(21, 68),
    90);
}

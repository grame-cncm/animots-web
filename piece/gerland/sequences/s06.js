/**
 * @file Séquence 6 (4' - 8').
 *
 * Généré par `npm run transpile` (transpiler/) depuis source/Gerland2013-4.lsp.
 * Ne pas modifier à la main : corriger le transpileur, puis régénérer.
 * tests/transpile.test.js vérifie que ce fichier est à jour.
 *
 * Commentaire d'origine :
 *     Séquence 6 (4' - 8')
 *     Percu Castagnet
 *     version pour 16 points         Multi M2
 *     avec fond général nuit (proba 1/2)
 *     avec insectes aléatoire
 *     avec phrase monocanal de percu castagnet
 *     avec phrase monocanal de guiro
 */

import { add, concat, freeGen, gnotes, h, nconcat, placeTempo, prorythme, rep, rnd, sel, shareGen, sub, useGen } from '../../../core/index.js';
import { once, placeProg, printDialog, selAl, xconcat } from '../tools.js';
import { GACCORD, GECAR, MULTIS, ZONE1, ZONE2, ZONE3 } from '../config.js';

/**
 * Séquence 6.
 * Traduction de `(sequence-6 deb fin)`, lignes 1287 à 1412.
 * @param {import('../../../core/score.js').Score} score Partition où écrire.
 * @param {import('../../../core/generators.js').GenLike} deb Début (noires), tiré une fois.
 * @param {import('../../../core/generators.js').GenLike} fin Fin (noires), tirée une fois.
 * @returns {void}
 */
export function sequence6(score, deb, fin) {
  printDialog(score, 'SEQUENCE 6');
  // prog-change
  placeProg(score, 0, MULTIS.m2);
  placeTempo(score, 0, 60);
  const deb2 = once(deb);
  const fin2 = once(fin);
  // fond général de nuit (proba 1/2)
  prorythme(score, 16, 0, fin2,
    gnotes({ laccord: GACCORD, lecar: GECAR, proba: h([0, 1, 1]) }),
    h([4, 8, 12, 16]),
    [112],
    rnd(21, 38),
    30);
  // percus castagnets répétées sur un canal; zone1
  shareGen('n1', h([1, 2, 2, 2, 2, 3, 3, 3, 4, 5]));
  prorythme(score, rep(h(ZONE1), useGen('n1')), add(deb2, h([0, 1, 2, 3, 4, 5, 6, 8, 10])), fin2,
    gnotes(),
    h([0, 4, 8, 10, 12, 20]),
    xconcat(useGen('n1'), selAl(3, [1 / 4], [1 / 2], [3], [5])),
    rep(rnd(97, 125), useGen('n1')),
    80);
  freeGen('n1');
  // percus castagnets répétées sur un canal; zone2
  shareGen('n1', h([1, 2, 2, 2, 2, 3, 3, 3, 4, 5]));
  prorythme(score, rep(h(ZONE2), useGen('n1')), add(deb2, h([0, 1, 2, 3, 4, 5, 6, 8, 10])), fin2,
    gnotes(),
    h([0, 4, 8, 10, 12, 20]),
    xconcat(useGen('n1'), selAl(3, [1 / 4], [1 / 2], [3], [5])),
    rep(rnd(97, 125), useGen('n1')),
    80);
  freeGen('n1');
  // percus castagnets répétées sur un canal; zone3
  shareGen('n1', h([1, 2, 2, 2, 2, 3, 3, 3, 4, 5]));
  prorythme(score, rep(h(ZONE3), useGen('n1')), add(deb2, h([0, 1, 2, 3, 4, 5, 6, 8, 10])), fin2,
    gnotes(),
    h([0, 4, 8, 10, 12, 20]),
    xconcat(useGen('n1'), selAl(3, [1 / 4], [1 / 2], [3], [5])),
    rep(rnd(97, 125), useGen('n1')),
    80);
  freeGen('n1');
  // un peu d'insectes aléatoires
  prorythme(score, rnd(16, 31), add(deb2, h([0, 1, 2, 3, 4, 5, 6, 8, 10])), fin2,
    gnotes(),
    h([0, 4, 4, 6, 8, 8]),
    selAl(6, [1 / 4], [1 / 2], [1], [3 / 2], [3], [5], [-4]),
    rnd(69, 78),
    h([100, 70, 80, 90, 80]));
  // phrase monocanal ou multicanal (proba 1/2) de percu castagnet
  // zone1
  shareGen('n1', h([8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]));
  prorythme(score, sel(rep(h([0, 1]), useGen('n1')), rep(h(ZONE1), useGen('n1')), h(ZONE1)), add(deb2, h([0, 1, 2, 3, 4, 5, 6, 8, 10])), fin2,
    gnotes({ proba: h([1, 1, 1, 1, 1, 0]) }),
    h([9, 13, 20, 20, 30, 30]),
    concat([1 / 2], nconcat(sub(useGen('n1'), 2), [1 / 8]), [4]),
    rep(rnd(97, 125), h([1, 1, 1, 2, 3])),
    100);
  freeGen('n1');
  // zone2
  shareGen('n1', h([8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]));
  prorythme(score, sel(rep(h([0, 1]), useGen('n1')), rep(h(ZONE2), useGen('n1')), h(ZONE1)), add(deb2, h([0, 1, 2, 3, 4, 5, 6, 8, 10])), fin2,
    gnotes({ proba: h([1, 1, 1, 1, 1, 0]) }),
    h([9, 13, 20, 20, 30, 30]),
    concat([1 / 2], nconcat(sub(useGen('n1'), 2), [1 / 8]), [4]),
    rep(rnd(97, 125), h([1, 1, 1, 2, 3])),
    100);
  freeGen('n1');
  // zone3
  shareGen('n1', h([8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]));
  prorythme(score, sel(rep(h([0, 1]), useGen('n1')), rep(h(ZONE3), useGen('n1')), h(ZONE1)), add(deb2, h([0, 1, 2, 3, 4, 5, 6, 8, 10])), fin2,
    gnotes({ proba: h([1, 1, 1, 1, 1, 0]) }),
    h([9, 13, 20, 20, 30, 30]),
    concat([1 / 2], nconcat(sub(useGen('n1'), 2), [1 / 8]), [4]),
    rep(rnd(97, 125), h([1, 1, 1, 2, 3])),
    100);
  freeGen('n1');
  // phrase multicanal de guiro
  // zone1
  shareGen('n1', h([12, 13, 14, 15, 16, 17, 18]));
  prorythme(score, h(ZONE1), add(deb2, 10, h([0, 1, 2, 3, 4, 5, 6, 8, 10])), fin2,
    gnotes({ proba: h([1, 1, 1, 1, 1, 0]) }),
    h([9, 13, 15, 20, 20, 25, 30]),
    concat([1 / 2], nconcat(sub(useGen('n1'), 2), [1 / 8]), [4]),
    rep(rnd(21, 68), h([1, 1, 1, 2, 3])),
    100);
  freeGen('n1');
  // zone2
  shareGen('n1', h([12, 13, 14, 15, 16, 17, 18]));
  prorythme(score, h(ZONE2), add(deb2, 10, h([0, 1, 2, 3, 4, 5, 6, 8, 10])), fin2,
    gnotes({ proba: h([1, 1, 1, 1, 1, 0]) }),
    h([9, 13, 15, 20, 20, 25, 30]),
    concat([1 / 2], nconcat(sub(useGen('n1'), 2), [1 / 8]), [4]),
    rep(rnd(21, 68), h([1, 1, 1, 2, 3])),
    100);
  freeGen('n1');
  // zone3
  shareGen('n1', h([12, 13, 14, 15, 16, 17, 18]));
  prorythme(score, h(ZONE3), add(deb2, 10, h([0, 1, 2, 3, 4, 5, 6, 8, 10])), fin2,
    gnotes({ proba: h([1, 1, 1, 1, 1, 0]) }),
    h([9, 13, 15, 20, 20, 25, 30]),
    concat([1 / 2], nconcat(sub(useGen('n1'), 2), [1 / 8]), [4]),
    rep(rnd(21, 68), h([1, 1, 1, 2, 3])),
    100);
  freeGen('n1');
}

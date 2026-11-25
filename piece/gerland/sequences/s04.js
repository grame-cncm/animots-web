/**
 * @file Séquence 4 (4' - 9').
 *
 * Généré par `npm run transpile` (transpiler/) depuis source/Gerland2013-4.lsp.
 * Ne pas modifier à la main : corriger le transpileur, puis régénérer.
 * tests/transpile.test.js vérifie que ce fichier est à jour.
 *
 * Commentaire d'origine :
 *     Séquence 4 (4' - 9')
 *     Guiro
 *     version pour 16 points         Multi M2
 *     avec fond général nuit (proba 1/2)
 *     avec trajectoires d'oiseaux
 *     avec insectes et oiseaux aléatoire
 *     avec phrase monocanal de faux insectes
 */

import { add, concat, freeGen, gnotes, h, lst, nconcat, placeTempo, prorythme, rep, rnd, shareGen, sub, useGen } from '../../../core/index.js';
import { once, placeProg, printDialog, selAl, xconcat } from '../tools.js';
import { GACCORD_DEMI, GECAR, MULTIS, ZONE1, ZONE2, ZONE3 } from '../config.js';

/**
 * Séquence 4.
 * Traduction de `(sequence-4 deb fin)`, lignes 1062 à 1173.
 * @param {import('../../../core/score.js').Score} score Partition où écrire.
 * @param {import('../../../core/generators.js').GenLike} deb Début (noires), tiré une fois.
 * @param {import('../../../core/generators.js').GenLike} fin Fin (noires), tirée une fois.
 * @returns {void}
 */
export function sequence4(score, deb, fin) {
  printDialog(score, 'SEQUENCE 4');
  // prog-change
  placeProg(score, 0, MULTIS.m2);
  placeTempo(score, 0, 60);
  const deb2 = once(deb);
  const fin2 = once(fin);
  // fond général nuit proba 1/2
  prorythme(score, 16, deb2, fin2,
    gnotes({ laccord: GACCORD_DEMI, lecar: GECAR, proba: h([1, 1, 1]) }),
    0,
    lst(sub(fin2, deb2)),
    rnd(21, 38),
    20);
  // Guiro répété sur un canal; zone1
  shareGen('n1', h([1, 2, 2, 2, 2, 3, 3, 3, 4, 5]));
  prorythme(score, rep(h(ZONE1), useGen('n1')), add(deb2, h([0, 1, 2, 3, 4, 5, 6, 8, 10])), fin2,
    gnotes(),
    h([0, 4, 8, 8, 12, 16]),
    xconcat(useGen('n1'), selAl(3, [1 / 4], [1 / 2], [3], [5])),
    rep(rnd(21, 68), useGen('n1')),
    90);
  freeGen('n1');
  // Guiro répété sur un canal; zone2
  shareGen('n1', h([1, 2, 2, 2, 2, 3, 3, 3, 4, 5]));
  prorythme(score, rep(h(ZONE2), useGen('n1')), add(deb2, h([0, 1, 2, 3, 4, 5, 6, 8, 10])), fin2,
    gnotes(),
    h([0, 4, 8, 8, 12, 16]),
    xconcat(useGen('n1'), selAl(3, [1 / 4], [1 / 2], [3], [5])),
    rep(rnd(21, 68), useGen('n1')),
    90);
  freeGen('n1');
  // Guiro répété sur un canal; zone3
  shareGen('n1', h([1, 2, 2, 2, 2, 3, 3, 3, 4, 5]));
  prorythme(score, rep(h(ZONE3), useGen('n1')), add(deb2, h([0, 1, 2, 3, 4, 5, 6, 8, 10])), fin2,
    gnotes(),
    h([0, 4, 8, 8, 12, 16]),
    xconcat(useGen('n1'), selAl(3, [1 / 4], [1 / 2], [3], [5])),
    rep(rnd(21, 68), useGen('n1')),
    90);
  freeGen('n1');
  // un peu d'oiseaux et d'insectes aléatoires répétés 1 ou 2 ou 3 fois sur un même canal
  // zone1
  shareGen('n1', h([1, 2, 3]));
  prorythme(score, rep(add(16, h(ZONE1)), useGen('n1')), add(deb2, h([0, 1, 2, 3, 4, 5, 6, 8, 10])), fin2,
    gnotes(),
    h([0, 4, 8, 8, 12, 16]),
    xconcat(useGen('n1'), selAl(4, [1 / 2], [1], [3 / 2], [3], [5])),
    rep(rnd(69, 83), useGen('n1')),
    rep(h([100, 70, 90, 80]), useGen('n1')));
  freeGen('n1');
  // zone2
  shareGen('n1', h([1, 2, 3]));
  prorythme(score, rep(add(16, h(ZONE2)), useGen('n1')), add(deb2, h([0, 1, 2, 3, 4, 5, 6, 8, 10])), fin2,
    gnotes(),
    h([0, 4, 8, 8, 12, 16]),
    xconcat(useGen('n1'), selAl(4, [1 / 2], [1], [3 / 2], [3], [5])),
    rep(rnd(69, 83), useGen('n1')),
    rep(h([100, 70, 90, 80]), useGen('n1')));
  freeGen('n1');
  // zone3
  // Désactivé dans le Lisp par un accent grave (ligne 1135), donc jamais exécuté :
  //   (share-gen n1 (h °(1 2 3)))
  prorythme(score, rep(add(16, h(ZONE3)), useGen('n1')), add(deb2, h([0, 1, 2, 3, 4, 5, 6, 8, 10])), fin2,
    gnotes(),
    h([0, 4, 8, 8, 12, 16]),
    xconcat(useGen('n1'), selAl(4, [1 / 2], [1], [3 / 2], [3], [5])),
    rep(rnd(69, 83), useGen('n1')),
    rep(h([100, 70, 90, 80]), useGen('n1')));
  freeGen('n1');
  // phrase monocanal de faux insectes
  // zone1
  shareGen('n1', h([6, 7, 8, 9, 10, 11, 12]));
  prorythme(score, rep(h(ZONE1), useGen('n1')), add(deb2, h([0, 1, 2, 3, 4, 5, 6, 8, 10])), fin2,
    gnotes({ proba: h([1, 1, 1, 1, 1, 0]) }),
    h([0, 5, 9, 11, 13, 15]),
    concat([1 / 2], nconcat(sub(useGen('n1'), 2), [1 / 8]), [4]),
    rep(rnd(21, 68), h([1, 1, 1, 2, 3])),
    90);
  freeGen('n1');
  // zone2
  shareGen('n1', h([6, 7, 8, 9, 10, 11, 12]));
  prorythme(score, rep(h(ZONE2), useGen('n1')), add(deb2, h([0, 1, 2, 3, 4, 5, 6, 8, 10])), fin2,
    gnotes({ proba: h([1, 1, 1, 1, 1, 0]) }),
    h([0, 5, 9, 11, 13, 15]),
    concat([1 / 2], nconcat(sub(useGen('n1'), 2), [1 / 8]), [4]),
    rep(rnd(21, 68), h([1, 1, 1, 2, 3])),
    90);
  freeGen('n1');
  // zone3
  shareGen('n1', h([6, 7, 8, 9, 10, 11, 12]));
  prorythme(score, rep(h(ZONE3), useGen('n1')), add(deb2, h([0, 1, 2, 3, 4, 5, 6, 8, 10])), fin2,
    gnotes({ proba: h([1, 1, 1, 1, 1, 0]) }),
    h([0, 5, 9, 11, 13, 15]),
    concat([1 / 2], nconcat(sub(useGen('n1'), 2), [1 / 8]), [4]),
    rep(rnd(21, 68), h([1, 1, 1, 2, 3])),
    90);
  freeGen('n1');
}

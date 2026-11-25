/**
 * @file Séquence 5 (5' - 10').
 *
 * Généré par `npm run transpile` (transpiler/) depuis source/Gerland2013-4.lsp.
 * Ne pas modifier à la main : corriger le transpileur, puis régénérer.
 * tests/transpile.test.js vérifie que ce fichier est à jour.
 *
 * Commentaire d'origine :
 *     Séquence 5 (5' - 10')
 *     Rivière
 *     version pour 16 points         Multi M2
 *     avec fond général rivière
 *     avec trajectoires d'oiseaux
 *     avec insectes et oiseaux aléatoire
 *     avec phrase monocanal d'oiseaux
 */

import { add, concat, freeGen, gnotes, h, lst, mult, nconcat, placeTempo, prorythme, rep, rnd, s, shareGen, sub, t, useGen } from '../../../core/index.js';
import { once, placeProg, printDialog, selAl, traj, xconcat } from '../tools.js';
import { GACCORD, GECAR, MULTIS, trajectoires, ZONE1 } from '../config.js';

/**
 * Séquence 5.
 * Traduction de `(sequence-5 deb fin)`, lignes 1196 à 1263.
 * @param {import('../../../core/score.js').Score} score Partition où écrire.
 * @param {import('../../../core/generators.js').GenLike} deb Début (noires), tiré une fois.
 * @param {import('../../../core/generators.js').GenLike} fin Fin (noires), tirée une fois.
 * @returns {void}
 */
export function sequence5(score, deb, fin) {
  printDialog(score, 'SEQUENCE 5');
  // prog-change
  placeProg(score, 0, MULTIS.m2);
  placeTempo(score, 0, 60);
  const deb2 = once(deb);
  const fin2 = once(fin);
  // fond général Rivière
  prorythme(score, 0, deb2, fin2,
    gnotes({ laccord: GACCORD, lecar: GECAR }),
    0,
    lst(sub(fin2, deb2)),
    rnd(126, 127),
    60);
  // un peu d'oiseaux aléatoires
  prorythme(score, rnd(16, 31), add(deb2, h([0, 2, 4, 6, 7, 8, 10])), fin2,
    gnotes(),
    h([0, 4, 4, 6, 8]),
    selAl(4, [1 / 2], [1], [3 / 2], [3], [5]),
    rnd(69, 125),
    100);
  // trajectoires aléatoires d'oiseaux aléatoires pour les 16 points
  shareGen('ntraj', h([4, 5, 6]));
  prorythme(score, add(16, s(traj(trajectoires(), mult(3, useGen('ntraj'))))), add(deb2, h([0, 2, 4, 6, 7, 8, 10])), fin2,
    gnotes(),
    h([8, 16, 20]),
    xconcat(useGen('ntraj'), [t('2/3c', [1 / 2, 1 / 2, 1 / 2])]),
    rep(rnd(79, 125), mult(3, useGen('ntraj'))),
    100);
  freeGen('ntraj');
  // phrase monocanal d'oiseaux
  // zone1
  shareGen('n1', h([12, 13, 14, 15, 16, 17, 18]));
  prorythme(score, rep(add(16, h(ZONE1)), useGen('n1')), 0, 96,
    gnotes({ proba: h([1, 1, 1, 1, 1, 0]) }),
    h([5, 9, 20, 13]),
    concat([1 / 2], nconcat(sub(useGen('n1'), 2), [1 / 8]), [4]),
    rep(rnd(79, 125), h([1, 1, 1, 2, 3])),
    90);
  freeGen('n1');
  // zone2
  shareGen('n1', h([12, 13, 14, 15, 16, 17, 18]));
  prorythme(score, rep(add(16, h(ZONE1)), useGen('n1')), 0, 96,
    gnotes({ proba: h([1, 1, 1, 1, 1, 0]) }),
    h([5, 9, 20, 13]),
    concat([1 / 2], nconcat(sub(useGen('n1'), 2), [1 / 8]), [4]),
    rep(rnd(79, 125), h([1, 1, 1, 2, 3])),
    90);
  freeGen('n1');
  // zone3
  shareGen('n1', h([12, 13, 14, 15, 16, 17, 18]));
  prorythme(score, rep(add(16, h(ZONE1)), useGen('n1')), 0, 96,
    gnotes({ proba: h([1, 1, 1, 1, 1, 0]) }),
    h([5, 9, 20, 13]),
    concat([1 / 2], nconcat(sub(useGen('n1'), 2), [1 / 8]), [4]),
    rep(rnd(79, 125), h([1, 1, 1, 2, 3])),
    90);
  freeGen('n1');
}

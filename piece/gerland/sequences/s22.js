/**
 * @file Séquence 22 (2' - 5') --------> cette séquence n'est plus jouée (5-11-2013).
 *
 * Généré par `npm run transpile` (transpiler/) depuis source/Gerland2013-4.lsp.
 * Ne pas modifier à la main : corriger le transpileur, puis régénérer.
 * tests/transpile.test.js vérifie que ce fichier est à jour.
 *
 * Commentaire d'origine :
 *     Séquence 22 (2' - 5') --------> cette séquence n'est plus jouée (5-11-2013)
 *     version pour 16 points groupés         Multi M7
 *     trajectoires circulaires de voix aléatoires répétées parfois doublées par des percus
 *     rythme constant °(1/8 1/8 1/8 1/8)
 *     staccato variables
 */

import { add, concat, freeGen, gnotes, h, lst, placeTempo, prorythme, rep, rnd, s, shareGen, useGen } from '../../../core/index.js';
import { once, placeProg, printDialog } from '../tools.js';
import { MULTIS, TRAJ_TOTAL_DIRECT, TRAJ_TOTAL_DIRECT2 } from '../config.js';

/**
 * Séquence 22.
 * Traduction de `(sequence-22 deb fin)`, lignes 3314 à 3347.
 * @param {import('../../../core/score.js').Score} score Partition où écrire.
 * @param {import('../../../core/generators.js').GenLike} deb Début (noires), tiré une fois.
 * @param {import('../../../core/generators.js').GenLike} fin Fin (noires), tirée une fois.
 * @returns {void}
 */
export function sequence22(score, deb, fin) {
  printDialog(score, 'SEQUENCE 22');
  // prog-change
  placeProg(score, 0, MULTIS.m7);
  placeTempo(score, 0, 60);
  const deb2 = once(deb);
  const fin2 = once(fin);
  // voix aléatoires répétées et circulairement
  shareGen('inter', h([0, 1, 1, 2, 2, 3, 3, 4, 5, 6, 10]));
  shareGen('velos', add(-30, h([70, 80, 90, 100, 110])));
  shareGen('repet', h([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));
  prorythme(score, s(concat(lst(rnd(0, 15)), TRAJ_TOTAL_DIRECT2)), add(deb2, 0), fin2,
    gnotes({ stac: rep(h([0.2, 5]), rnd(8, 24)) }),
    useGen('inter'),
    [1 / 8, 1 / 8, 1 / 8, 1 / 8, 1 / 8],
    rep(rnd(21, 50), s([1, 2, 3, 4, 5, 6, 7, 8])),
    rep(useGen('velos'), useGen('repet')));
  // percu aléatoires répétées et circulairement et synchrone aux voix
  prorythme(score, s(TRAJ_TOTAL_DIRECT), add(deb2, 0), fin2,
    gnotes(),
    useGen('inter'),
    [1 / 8, 1 / 8, 1 / 8, 1 / 8, 1 / 8],
    rep(rnd(69, 125), s([1, 2, 3, 4, 5, 6, 7, 8])),
    rep(useGen('velos'), useGen('repet')));
  freeGen('inter');
  freeGen('velos');
  freeGen('repet');
}

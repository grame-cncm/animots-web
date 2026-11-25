/**
 * @file Séquence 21 (2' - 5').
 *
 * Généré par `npm run transpile` (transpiler/) depuis source/Gerland2013-4.lsp.
 * Ne pas modifier à la main : corriger le transpileur, puis régénérer.
 * tests/transpile.test.js vérifie que ce fichier est à jour.
 *
 * Commentaire d'origine :
 *     Séquence 21 (2' - 5')
 *     version pour 16 points groupés         Multi M7
 *     trajectoires circulaires de vois aléatoires parfois doublées par des oiseaux et/ou percu
 *     rythme constant °(1/8 1/8 1/8 1/8) ou °(1)
 *     voix aléatoires répétées de plus en plus et circulairement
 *     oiseaux/percu aléatoires répétées de plus en plus et circulairement et synchrone aux voix
 */

import { add, concat, freeGen, gnotes, h, lst, placeTempo, prorythme, rep, rnd, s, sel, shareGen, useGen } from '../../../core/index.js';
import { once, placeProg, printDialog } from '../tools.js';
import { GACCORD_DEMI, GECAR, MULTIS, TRAJ_TOTAL_DIRECT2 } from '../config.js';

/**
 * Séquence 21.
 * Traduction de `(sequence-21 deb fin)`, lignes 3258 à 3291.
 * @param {import('../../../core/score.js').Score} score Partition où écrire.
 * @param {import('../../../core/generators.js').GenLike} deb Début (noires), tiré une fois.
 * @param {import('../../../core/generators.js').GenLike} fin Fin (noires), tirée une fois.
 * @returns {void}
 */
export function sequence21(score, deb, fin) {
  printDialog(score, 'SEQUENCE 21');
  // prog-change
  placeProg(score, 0, MULTIS.m7);
  placeTempo(score, 0, 60);
  const deb2 = once(deb);
  const fin2 = once(fin);
  // voix aléatoires répétées de plus en plus et circulairement
  shareGen('inter', h([0, 0, 0, 1, 2, 2, 2, 3, 3, 4, 5, 6, 10]));
  shareGen('velos', add(-30, h([70, 80, 90, 100, 110])));
  shareGen('choix', h([0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 2, 3, 4]));
  prorythme(score, s(concat(lst(rnd(0, 15)), TRAJ_TOTAL_DIRECT2)), add(deb2, 0), fin2,
    gnotes({ laccord: sel(useGen('choix'), [0], [0], [0], GACCORD_DEMI, GACCORD_DEMI), lecar: GECAR }),
    useGen('inter'),
    sel(
      useGen('choix'),
      [1 / 8, 1 / 8, 1 / 8, 1 / 8],
      [1 / 8, 1 / 8, 1 / 8, 1 / 8, 1 / 8, 1 / 8, 1 / 8, 1 / 8, 1 / 8, 1 / 8, 1 / 8, 1 / 8, 1 / 8, 1 / 8, 1 / 8, 1 / 8],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [4],
      [4, 4]),
    rep(rnd(21, 50), s([1, 2, 3, 4, 5, 6, 7, 8, 9])),
    add(
      -10,
      sel(
        useGen('choix'),
        rep(useGen('velos'), s([1, 2, 3, 4, 5, 6, 7])),
        rep(useGen('velos'), s([1, 2, 3, 4, 5, 6, 7])),
        rep(useGen('velos'), s([1, 2, 3, 4, 5, 6, 7])),
        40,
        s([40, 40]))));
  // oiseaux/percu aléatoires répétées de plus en plus et circulairement et synchrone aux voix
  prorythme(score, s(TRAJ_TOTAL_DIRECT2), add(deb2, 0), fin2,
    gnotes(
      { proba: rep(h([0, 1, 1]), rnd(2, 16)), laccord: sel(useGen('choix'), [0], [0], [0], GACCORD_DEMI, GACCORD_DEMI), lecar: GECAR }),
    useGen('inter'),
    sel(
      useGen('choix'),
      [1 / 8, 1 / 8, 1 / 8, 1 / 8],
      [1 / 8, 1 / 8, 1 / 8, 1 / 8, 1 / 8, 1 / 8, 1 / 8, 1 / 8, 1 / 8, 1 / 8, 1 / 8, 1 / 8, 1 / 8, 1 / 8, 1 / 8, 1 / 8],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [4],
      [4, 4]),
    rep(rnd(69, 125), s([1, 2, 3, 4, 5, 6, 7, 8, 9])),
    sel(
      useGen('choix'),
      rep(useGen('velos'), s([1, 2, 3, 4, 5, 6, 7])),
      rep(useGen('velos'), s([1, 2, 3, 4, 5, 6, 7])),
      rep(useGen('velos'), s([1, 2, 3, 4, 5, 6, 7])),
      40,
      s([40, 40])));
  freeGen('inter');
  freeGen('velos');
  freeGen('choix');
}

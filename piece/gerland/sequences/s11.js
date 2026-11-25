/**
 * @file Séquence 11 (4' - 9').
 *
 * Généré par `npm run transpile` (transpiler/) depuis source/Gerland2013-4.lsp.
 * Ne pas modifier à la main : corriger le transpileur, puis régénérer.
 * tests/transpile.test.js vérifie que ce fichier est à jour.
 *
 * Commentaire d'origine :
 *     Séquence 11 (4' - 9')
 *     Cloches (rares)
 *     version pour 16 points       Multi M4
 *     phrase éclatée (par groupe) de triangles
 *     triangles aigus répétés
 *     insectes rares aléatoires
 */

import { add, concat, freeGen, gnotes, h, nconcat, placeTempo, prorythme, rep, rnd, s, sel, shareGen, sub, t, useGen } from '../../../core/index.js';
import { groupe, once, placeProg, printDialog, selAl } from '../tools.js';
import { GACCORD, GECAR, listgroupe, MULTIS, ZONE1, ZONE2, ZONE3 } from '../config.js';

/**
 * Séquence 11.
 * Traduction de `(sequence-11 deb fin)`, lignes 1879 à 1990.
 * @param {import('../../../core/score.js').Score} score Partition où écrire.
 * @param {import('../../../core/generators.js').GenLike} deb Début (noires), tiré une fois.
 * @param {import('../../../core/generators.js').GenLike} fin Fin (noires), tirée une fois.
 * @returns {void}
 */
export function sequence11(score, deb, fin) {
  printDialog(score, 'SEQUENCE 11');
  // prog-change
  placeProg(score, 0, MULTIS.m4);
  placeTempo(score, 0, 60);
  const deb2 = once(deb);
  const fin2 = once(fin);
  // phrase éclatée (par groupe) de triangles
  shareGen('n1', h([6, 7, 8, 9, 10, 11]));
  // nbre de sons par groupe d'enceinte
  prorythme(score, sub(s(groupe(listgroupe(), useGen('n1'), h([1, 2, 3]))), 16), add(deb2, h([0, 1, 2, 4, 6, 7, 8, 10])), fin2,
    gnotes({ stac: 3 }),
    h([4, 4, 8, 16, 32, 24]),
    concat(
      [1 / 2],
      nconcat(sub(useGen('n1'), 2), selAl(6, [1], [2], [t('2/3n', [2, 1])], [3], [1 / 4], [1 / 4], [1 / 4])),
      [10]),
    rep(rnd(21, 83), h([1, 1, 1, 1, 1, 2, 2, 3, 3, 3, 4])),
    h([60, 70, 90, 110, 10]));
  freeGen('n1');
  // triangles graves répétés global répété sur même canal
  shareGen('n1', h([3, 4, 5, 6, 7]));
  prorythme(score, rep(rnd(0, 15), useGen('n1')), add(deb2, h([0, 1, 3, 5, 7, 9, 11])), fin2,
    gnotes({ stac: 3 }),
    h([16, 32, 24, 28]),
    concat(
      nconcat(
        sub(useGen('n1'), 1),
        rep(h([[1], [3 / 2], [t('2/3b', [2, 2, 2])], [2], [3]]), sub(useGen('n1'), 1))),
      [10]),
    rep(rnd(33, 60), h([7, 14, 21])),
    80);
  freeGen('n1');
  // triangles graves multicanal répétés par zone
  shareGen('n1', h([3, 4, 5, 6, 7]));
  prorythme(score, sel(rep(h([0, 0, 1, 1, 2]), useGen('n1')), h(ZONE1), h(ZONE2), h(ZONE2)), add(deb2, h([0, 1, 3, 5, 7, 9, 11])), fin2,
    gnotes({ stac: 3 }),
    h([16, 12, 24, 28]),
    concat(
      nconcat(
        sub(useGen('n1'), 1),
        rep(h([[1], [3 / 2], [t('2/3b', [2, 2, 2])], [2], [3]]), sub(useGen('n1'), 1))),
      [10]),
    rep(rnd(33, 60), h([7, 14, 21])),
    80);
  freeGen('n1');
  // triangles aigus répétés
  // zone1
  shareGen('n1', h([3, 4, 5, 6, 7]));
  prorythme(score, rep(h(ZONE1), useGen('n1')), add(deb2, h([0, 1, 3, 5, 7, 9, 11])), fin2,
    gnotes({ stac: 3 }),
    h([16, 32, 24]),
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
  prorythme(score, rep(h(ZONE2), useGen('n1')), add(deb2, h([0, 1, 3, 5, 7, 9, 11])), fin2,
    gnotes({ stac: 3 }),
    h([16, 32, 24]),
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
  prorythme(score, rep(h(ZONE3), useGen('n1')), add(deb2, h([0, 1, 3, 5, 7, 9, 11])), fin2,
    gnotes({ stac: 3 }),
    h([16, 32, 24]),
    concat(
      nconcat(
        sub(useGen('n1'), 1),
        rep(h([[1 / 8], [t('2/3dc', [1 / 4, 1 / 4, 1 / 4])], [1 / 4]]), sub(useGen('n1'), 1))),
      [10]),
    rep(rnd(74, 83), h([7, 14, 21])),
    100);
  freeGen('n1');
  // un peu de "tenu" jour / nuit brèves aléatoires synchro
  prorythme(score, 16, add(deb2, h([0, 1, 2, 4, 6, 7, 8, 10])), fin2,
    gnotes({ laccord: GACCORD, lecar: GECAR }),
    h([4, 8, 20, 20, 32]),
    selAl(3, [8], [3], [4], [6]),
    rnd(21, 68),
    40);
  // insectes rares aléatoires
  // zone1
  prorythme(score, add(16, h(ZONE1)), add(deb2, h([0, 1, 2, 4, 6, 7, 8, 10])), fin2,
    gnotes(),
    h([5, 7, 9, 12, 14]),
    selAl(7, [1 / 4], [1 / 2], [1 / 2], [1 / 2], [1], [3 / 2], [3], [5]),
    rnd(69, 78),
    90);
  // zone2
  prorythme(score, add(16, h(ZONE2)), add(deb2, h([0, 1, 2, 4, 6, 7, 8, 10])), fin2,
    gnotes(),
    h([5, 7, 9, 12, 14]),
    selAl(7, [1 / 4], [1 / 2], [1 / 2], [1 / 2], [1], [3 / 2], [3], [5]),
    rnd(69, 78),
    90);
  // zone3
  prorythme(score, add(16, h(ZONE3)), add(deb2, h([0, 1, 2, 4, 6, 7, 8, 10])), fin2,
    gnotes(),
    h([5, 7, 9, 12, 14]),
    selAl(7, [1 / 4], [1 / 2], [1 / 2], [1 / 2], [1], [3 / 2], [3], [5]),
    rnd(69, 78),
    90);
}

/**
 * @file Séquence 12 (4' - 8').
 *
 * Généré par `npm run transpile` (transpiler/) depuis source/Gerland2013-4.lsp.
 * Ne pas modifier à la main : corriger le transpileur, puis régénérer.
 * tests/transpile.test.js vérifie que ce fichier est à jour.
 *
 * Commentaire d'origine :
 *     Séquence 12 (4' - 8')
 *     Cloches et voix
 *     version pour 16 points       Multi M8
 *     avec phrase éclatée de triangles
 *     avec triangles graves ou aigus répétés
 *     avec voix rares aléatoires
 */

import { add, concat, freeGen, gnotes, h, mem, nconcat, placeTempo, prorythme, rep, rnd, shareGen, sub, t, useGen } from '../../../core/index.js';
import { once, placeProg, printDialog, selAl } from '../tools.js';
import { GACCORD, GECAR, MULTIS, ZONE1, ZONE2, ZONE3 } from '../config.js';

/**
 * Séquence 12.
 * Traduction de `(sequence-12 deb fin)`, lignes 2012 à 2085.
 * @param {import('../../../core/score.js').Score} score Partition où écrire.
 * @param {import('../../../core/generators.js').GenLike} deb Début (noires), tiré une fois.
 * @param {import('../../../core/generators.js').GenLike} fin Fin (noires), tirée une fois.
 * @returns {void}
 */
export function sequence12(score, deb, fin) {
  printDialog(score, 'SEQUENCE 12');
  // prog-change
  placeProg(score, 0, MULTIS.m8);
  placeTempo(score, 0, 60);
  const deb2 = once(deb);
  const fin2 = once(fin);
  // phrase éclatée de triangles
  prorythme(score, rnd(0, 15), add(deb2, h([0, 1, 2, 4, 6, 7, 8, 10])), fin2,
    gnotes({ proba: h([1, 1, 1, 1, 1, 0]), stac: 3 }),
    h([4, 4, 8, 16, 24]),
    concat([1 / 2], nconcat(h([3, 4, 5, 6, 7]), selAl(4, [1], [2], [t('2/3n', [1, -1, 1])], [3], [3])), [10]),
    rep(rnd(21, 83), h([1, 1, 1, 1, 1, 2, 2, 3, 3, 3, 4])),
    100);
  // triangles graves répétés
  shareGen('n1', h([3, 4, 5, 6, 7]));
  prorythme(score, rep(rnd(0, 15), useGen('n1')), deb2, fin2,
    gnotes({ stac: 8 }),
    h([16, 8, 24]),
    concat(
      nconcat(
        sub(useGen('n1'), 1),
        rep(h([[1], [3 / 2], [t('2/3b', [2, 2, 2])], [2], [3]]), sub(useGen('n1'), 1))),
      [10]),
    rep(rnd(21, 60), h([7, 14, 21])),
    90);
  freeGen('n1');
  // triangles aigus répétés
  shareGen('n1', h([3, 4, 5, 6, 7]));
  prorythme(score, rep(rnd(0, 15), useGen('n1')), deb2, fin2,
    gnotes({ stac: 3 }),
    h([16, 32, 24]),
    concat(
      nconcat(
        sub(useGen('n1'), 1),
        rep(h([[1 / 8], [t('2/3dc', [1 / 4, 1 / 4, 1 / 4])], [1 / 4]]), sub(useGen('n1'), 1))),
      [10]),
    rep(rnd(74, 83), h([7, 14, 21])),
    90);
  freeGen('n1');
  // un peu de "tenu" jour brèves aléatoires synchro
  prorythme(score, 16, add(deb2, h([0, 1, 2, 4, 6, 7, 8, 10])), fin2,
    gnotes({ laccord: GACCORD, lecar: GECAR }),
    h([4, 8, 20, 20, 32]),
    selAl(3, [8], [10], [4], [6]),
    rnd(51, 68),
    40);
  // voix rares aléatoires
  prorythme(score, rep(add(16, h(ZONE1)), h([2, 3])), add(deb2, h([0, 1, 2, 4, 6, 7, 8, 10])), fin2,
    gnotes(),
    h([0, 1, 5, 9, 13]),
    nconcat(h([2, 3]), rep(selAl(2, [1 / 8], [1 / 8], [1 / 16]), h([2, 3]))),
    mem(rnd(21, 50), 3, 4),
    90);
  prorythme(score, rep(add(16, h(ZONE2)), h([2, 3])), add(deb2, h([0, 1, 2, 4, 6, 7, 8, 10])), fin2,
    gnotes(),
    h([0, 1, 4, 7, 12]),
    nconcat(h([2, 3]), rep(selAl(2, [1 / 8], [1 / 8], [1 / 16]), h([2, 3]))),
    mem(rnd(21, 50), 3, 4),
    90);
  prorythme(score, rep(add(16, h(ZONE3)), h([4, 3])), add(deb2, h([1 / 2, 1, 2, 4, 6, 7, 8, 10])), fin2,
    gnotes(),
    h([0, 1 / 2, 4, 7, 12]),
    nconcat(h([4, 3]), rep(selAl(2, [1 / 8], [1 / 8], [1 / 16]), h([4, 3]))),
    mem(rnd(21, 50), 3, 4),
    90);
}

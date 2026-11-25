/**
 * @file Séquence 3 (5' - 10').
 *
 * Généré par `npm run transpile` (transpiler/) depuis source/Gerland2013-4.lsp.
 * Ne pas modifier à la main : corriger le transpileur, puis régénérer.
 * tests/transpile.test.js vérifie que ce fichier est à jour.
 *
 * Commentaire d'origine :
 *     Séquence 3 (5' - 10')
 *     Jour
 *     version pour 8 points         Multi M2
 *     avec fond général (proba 1/2) tenu jour
 *     avec trajectoires d'oiseaux
 *     avec oiseaux aléatoire non répétés
 *     avec phrase monocanal d'oiseaux
 */

import { add, concat, freeGen, gnotes, h, lst, mult, nconcat, placeTempo, prorythme, rep, rnd, s, shareGen, sub, t, useGen } from '../../../core/index.js';
import { once, placeProg, printDialog, selAl, traj, xconcat } from '../tools.js';
import { GACCORD_DEMI, GECAR, MULTIS, trajectoires, ZONE1, ZONE2, ZONE3 } from '../config.js';

/**
 * Séquence 3.
 * Traduction de `(sequence-3 deb fin)`, lignes 937 à 1039.
 * @param {import('../../../core/score.js').Score} score Partition où écrire.
 * @param {import('../../../core/generators.js').GenLike} deb Début (noires), tiré une fois.
 * @param {import('../../../core/generators.js').GenLike} fin Fin (noires), tirée une fois.
 * @returns {void}
 */
export function sequence3(score, deb, fin) {
  printDialog(score, 'SEQUENCE 3');
  // prog-change
  placeProg(score, 0, MULTIS.m2);
  placeTempo(score, 0, 60);
  const deb2 = once(deb);
  const fin2 = once(fin);
  // fond général jour proba 1/2
  prorythme(score, 16, deb2, fin2,
    gnotes({ laccord: GACCORD_DEMI, lecar: GECAR, proba: h([0, 1, 1, 1]) }),
    0,
    lst(sub(fin2, deb2)),
    rnd(39, 68),
    30);
  // Chant répété d'un oiseau sur un canal
  // zone1
  shareGen('n1', h([1, 2, 2, 2, 2, 3, 3, 3, 4, 5]));
  // débuts décallés aléatoirement
  prorythme(score, rep(add(16, h(ZONE1)), useGen('n1')), add(deb2, h([0, 2, 4, 6, 7, 8, 10])), fin2,
    gnotes(),
    h([5, 7, 10, 11]),
    xconcat(useGen('n1'), selAl(5, [1 / 4], [1 / 2], [1], [3 / 2], [3], [5])),
    rep(rnd(69, 125), useGen('n1')),
    90);
  freeGen('n1');
  // zone2
  shareGen('n1', h([1, 2, 2, 2, 2, 3, 3, 3, 4, 5]));
  prorythme(score, rep(add(16, h(ZONE2)), useGen('n1')), add(deb2, h([0, 2, 4, 6, 7, 8, 10])), fin2,
    gnotes(),
    h([5, 7, 10, 11]),
    xconcat(useGen('n1'), selAl(5, [1 / 4], [1 / 2], [1], [3 / 2], [3], [5])),
    rep(rnd(69, 125), useGen('n1')),
    90);
  freeGen('n1');
  // zone3
  shareGen('n1', h([1, 2, 2, 2, 2, 3, 3, 3, 4, 5]));
  prorythme(score, rep(add(16, h(ZONE3)), useGen('n1')), add(deb2, h([0, 2, 4, 6, 7, 8, 10])), fin2,
    gnotes(),
    h([5, 7, 10, 11]),
    xconcat(useGen('n1'), selAl(5, [1 / 4], [1 / 2], [1], [3 / 2], [3], [5])),
    rep(rnd(69, 125), useGen('n1')),
    90);
  freeGen('n1');
  // Un son d'oiseau sur canal qq
  prorythme(score, rnd(16, 31), add(deb2, h([0, 2, 4, 6, 7, 8, 10])), fin2,
    gnotes(),
    h([3, 4, 6, 7, 8, 12]),
    selAl(4, [1 / 2], [1], [3 / 2], [3], [5]),
    rnd(69, 125),
    90);
  // Phrase monocanal d'oiseaux
  // zone1
  shareGen('n1', h([12, 13, 14, 15, 16, 17, 18]));
  prorythme(score, rep(add(16, h(ZONE1)), useGen('n1')), deb2, fin2,
    gnotes({ proba: h([1, 1, 1, 1, 1, 0]) }),
    h([0, 5, 9, 13, 15]),
    concat([1 / 2], nconcat(sub(useGen('n1'), 2), [1 / 8]), [4]),
    rep(rnd(79, 125), h([1, 1, 1, 2, 3])),
    90);
  freeGen('n1');
  // zone 2
  shareGen('n1', h([12, 13, 14, 15, 16, 17, 18]));
  prorythme(score, rep(add(16, h(ZONE2)), useGen('n1')), deb2, fin2,
    gnotes({ proba: h([1, 1, 1, 1, 1, 0]) }),
    h([0, 5, 9, 13, 15]),
    concat([1 / 2], nconcat(sub(useGen('n1'), 2), [1 / 8]), [4]),
    rep(rnd(79, 125), h([1, 1, 1, 2, 3])),
    90);
  freeGen('n1');
  // zone3
  shareGen('n1', h([12, 13, 14, 15, 16, 17, 18]));
  prorythme(score, rep(add(16, h(ZONE3)), useGen('n1')), deb2, fin2,
    gnotes({ proba: h([1, 1, 1, 1, 1, 0]) }),
    h([0, 5, 9, 13, 15]),
    concat([1 / 2], nconcat(sub(useGen('n1'), 2), [1 / 8]), [4]),
    rep(rnd(79, 125), h([1, 1, 1, 2, 3])),
    90);
  freeGen('n1');
  // trajectoires aléatoires d'oiseaux aléatoires ;;
  // soit des trajectoires de 12, 15 ou 18 points
  shareGen('ntraj', h([4, 5, 6]));
  prorythme(score, add(16, s(traj(trajectoires(), mult(3, useGen('ntraj'))))), add(deb2, h([0, 2, 4, 6, 7, 8, 10])), fin2,
    gnotes(),
    h([8, 16, 32]),
    xconcat(useGen('ntraj'), [t('2/3c', [1 / 2, 1 / 2, 1 / 2])]),
    rep(rnd(79, 125), mult(3, useGen('ntraj'))),
    120);
  freeGen('ntraj');
}

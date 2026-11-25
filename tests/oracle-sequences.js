/**
 * @file Oracle : séquences 2 (« Nuit ») et 3 (« Jour ») traduites À LA MAIN, ligne à ligne.
 *
 * Écrites en phase 2, avant le transpileur. tests/transpile.test.js vérifie que le code
 * généré (piece/gerland/sequences/s02.js, s03.js) produit exactement la même partition,
 * graine par graine : deux traductions indépendantes qui concordent.
 *
 * Chaque séquence garde la signature du Lisp, `(sequence-N deb fin)` : `deb` et `fin` sont des
 * générateurs, tirés une seule fois au début (`(g (car (l 1 deb)))`, voir `once`). Elle écrit
 * dans la partition qu'on lui passe. Les flux partagés (`share-gen n1`...) utilisent le registre
 * global, comme les symboles du Lisp ; chaque séquence les libère à la fin.
 *
 * Les commentaires reprennent ceux du fichier Lisp ; les numéros de ligne renvoient à
 * Gerland2013-4.lsp.
 */

import {
  add, sub, mult, h, s, rnd, rep, lst, concat, nconcat, parseRhythm, shareGen, useGen, freeGen,
  gnotes, prorythme, placeTempo,
} from '../core/index.js';
import { xconcat, selAl, traj, once, placeProg, printDialog } from '../piece/gerland/tools.js';
import { MULTIS, GACCORD_DEMI, GECAR, ZONE1, ZONE2, ZONE3, TEMPO, trajectoires } from '../piece/gerland/config.js';

/**
 * Séquence 2 (5' à 10'), « Nuit », multi M2, version pour 16 points (lignes 886 à 914).
 * Fond de nuit tenu sur une enceinte sur deux, oiseaux et insectes aléatoires répétés 1 ou
 * 2 fois sur un même canal, diffusés sur 3 enceintes (une par zone).
 * @param {import('../core/score.js').Score} score
 * @param {import('../core/generators.js').GenLike} deb Début (noires).
 * @param {import('../core/generators.js').GenLike} fin Fin (noires).
 * @returns {void}
 */
export function sequence2(score, deb, fin) {
  printDialog(score, 'SEQUENCE 2');
  placeProg(score, 0, MULTIS.m2);
  placeTempo(score, 0, TEMPO);
  const deb2 = once(deb), fin2 = once(fin);

  // fond général nuit synchro proba 1/2
  prorythme(score, 16, deb2, fin2,
    gnotes({ laccord: GACCORD_DEMI, lecar: GECAR }),
    0,
    lst(sub(fin2, deb2)),
    rnd(21, 38),
    30);

  // oiseaux et insectes aléatoires répétés 1 ou 2 fois sur un même canal (diffusé sur de 3 à 8 canaux)
  shareGen('n1', h([1, 2, 1, 2, 3]));
  prorythme(score, 16, add(deb2, h([0, 2, 4, 6, 7, 8, 10])), fin2,
    gnotes({ laccord: lst(h(ZONE1), h(ZONE2), h(ZONE3)), lecar: GECAR }),
    h([0, 4, 4, 6, 8]),
    xconcat(useGen('n1'), selAl(4, [1 / 2], [1], [3 / 2], [3], [5])),
    rep(rnd(69, 85), useGen('n1')),
    rep(h([90, 80, 70]), useGen('n1')));
  freeGen('n1');
}

/**
 * Séquence 3 (5' à 10'), « Jour », multi M2 (lignes 937 à 1039) : fond général de jour
 * (proba 3/4), chant répété d'un oiseau par zone, un son d'oiseau sur un canal quelconque,
 * phrases monocanal d'oiseaux par zone, trajectoires d'oiseaux de 12, 15 ou 18 points.
 * @param {import('../core/score.js').Score} score
 * @param {import('../core/generators.js').GenLike} deb Début (noires).
 * @param {import('../core/generators.js').GenLike} fin Fin (noires).
 * @returns {void}
 */
export function sequence3(score, deb, fin) {
  printDialog(score, 'SEQUENCE 3');
  placeProg(score, 0, MULTIS.m2);
  placeTempo(score, 0, TEMPO);
  const deb2 = once(deb), fin2 = once(fin);

  // fond général jour proba 1/2 (le code tire 0 une fois sur 4)
  prorythme(score, 16, deb2, fin2,
    gnotes({ laccord: GACCORD_DEMI, lecar: GECAR, proba: h([0, 1, 1, 1]) }),
    0,
    lst(sub(fin2, deb2)),
    rnd(39, 68),
    30);

  // Chant répété d'un oiseau sur un canal, zones 1, 2 et 3 ; débuts décalés aléatoirement
  for (const zone of [ZONE1, ZONE2, ZONE3]) {
    shareGen('n1', h([1, 2, 2, 2, 2, 3, 3, 3, 4, 5]));
    prorythme(score, rep(add(16, h(zone)), useGen('n1')), add(deb2, h([0, 2, 4, 6, 7, 8, 10])), fin2,
      gnotes(),
      h([5, 7, 10, 11]),
      xconcat(useGen('n1'), selAl(5, [1 / 4], [1 / 2], [1], [3 / 2], [3], [5])),
      rep(rnd(69, 125), useGen('n1')),
      90);
    freeGen('n1');
  }

  // Un son d'oiseau sur canal qq
  prorythme(score, rnd(16, 31), add(deb2, h([0, 2, 4, 6, 7, 8, 10])), fin2,
    gnotes(),
    h([3, 4, 6, 7, 8, 12]),
    selAl(4, [1 / 2], [1], [3 / 2], [3], [5]),
    rnd(69, 125),
    90);

  // Phrase monocanal d'oiseaux, zones 1, 2 et 3
  for (const zone of [ZONE1, ZONE2, ZONE3]) {
    shareGen('n1', h([12, 13, 14, 15, 16, 17, 18]));
    prorythme(score, rep(add(16, h(zone)), useGen('n1')), deb2, fin2,
      gnotes({ proba: h([1, 1, 1, 1, 1, 0]) }),
      h([0, 5, 9, 13, 15]),
      concat([1 / 2], nconcat(sub(useGen('n1'), 2), [1 / 8]), [4]),
      rep(rnd(79, 125), h([1, 1, 1, 2, 3])),
      90);
    freeGen('n1');
  }

  // trajectoires aléatoires d'oiseaux aléatoires : trajectoires de 12, 15 ou 18 points
  shareGen('ntraj', h([4, 5, 6]));
  prorythme(score, add(16, s(traj(trajectoires(), mult(3, useGen('ntraj'))))), add(deb2, h([0, 2, 4, 6, 7, 8, 10])), fin2,
    gnotes(),
    h([8, 16, 32]),
    xconcat(useGen('ntraj'), parseRhythm('(2/3c(1/2 1/2 1/2))')),
    rep(rnd(79, 125), mult(3, useGen('ntraj'))),
    120);
  freeGen('ntraj');
}

/** Séquences de l'oracle, par numéro. */
export const ORACLE = Object.freeze({ 2: sequence2, 3: sequence3 });

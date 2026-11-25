/**
 * @file Séquence 29 (3' - 8').
 *
 * Généré par `npm run transpile` (transpiler/) depuis source/Gerland2013-4.lsp.
 * Ne pas modifier à la main : corriger le transpileur, puis régénérer.
 * tests/transpile.test.js vérifie que ce fichier est à jour.
 *
 * Commentaire d'origine :
 *     Séquence 29 (3' - 8')
 *     Triangles harmoniques lent et calme, quasi synchrones     Multi M5
 *     avec quelques voix rares et répétées
 *     version pour 16 points
 */

import { add, freeGen, gnotes, h, L, lst, placeTempo, prorythme, rep, rnd, s, seq, shareGen, useGen } from '../../../core/index.js';
import { dateDur, glistedate, once, placeProg, printDialog, transfDat } from '../tools.js';
import { GACCORD_DEMI, GECAR, MULTIS } from '../config.js';

/**
 * Séquence 29.
 * Traduction de `(sequence-29 deb fin)`, lignes 4154 à 4243.
 * @param {import('../../../core/score.js').Score} score Partition où écrire.
 * @param {import('../../../core/generators.js').GenLike} deb Début (noires), tiré une fois.
 * @param {import('../../../core/generators.js').GenLike} fin Fin (noires), tirée une fois.
 * @returns {void}
 */
export function sequence29(score, deb, fin) {
  printDialog(score, 'SEQUENCE 29');
  // prog-change
  placeProg(score, 0, MULTIS.m5);
  placeTempo(score, 0, 60);
  const deb2 = once(deb);
  const fin2 = once(fin);
  const ldate1 = L(1, glistedate(deb2, fin2, h([12, 16, 8, 10])))[0];
  const ldate2 = L(1, transfDat(ldate1, h([-0.7, -0.5, -0.3, -0.25, -0.2, -0.15, -0.1, -0.05, 0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.5, 0.7])))[0];
  const ldate3 = L(1, transfDat(ldate1, h([-0.7, -0.5, -0.3, -0.25, -0.2, -0.15, -0.1, -0.05, 0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.5, 0.7])))[0];
  const ldate4 = L(1, transfDat(ldate1, h([-0.7, -0.5, -0.3, -0.25, -0.2, -0.15, -0.1, -0.05, 0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.5, 0.7])))[0];
  const ldate5 = L(1, transfDat(ldate1, h([-0.7, -0.5, -0.3, -0.25, -0.2, -0.15, -0.1, -0.05, 0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.5, 0.7])))[0];
  const ldate6 = L(1, transfDat(ldate1, h([-0.7, -0.5, -0.3, -0.25, -0.2, -0.15, -0.1, -0.05, 0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.5, 0.7])))[0];
  const ldur1 = dateDur(ldate1);
  const ldur2 = dateDur(ldate2);
  const ldur3 = dateDur(ldate3);
  const ldur4 = dateDur(ldate4);
  const ldur5 = dateDur(ldate5);
  const ldur6 = dateDur(ldate6);
  prorythme(score, rnd(0, 15), deb2, fin2,
    gnotes(),
    0,
    lst(s(ldur1)),
    add(seq(0, 7, 2, 4), h([59, 63, 66, 69, 76])),
    h([90, 80, 70, 60]));
  prorythme(score, rnd(0, 15), deb2, fin2,
    gnotes(),
    0,
    lst(s(ldur2)),
    add(seq(0, 7, 2, 4), h([59, 63, 66, 69, 76])),
    h([90, 80, 70, 60]));
  prorythme(score, rnd(0, 15), deb2, fin2,
    gnotes(),
    0,
    lst(s(ldur3)),
    add(seq(0, 7, 2, 4), h([59, 63, 66, 69, 76])),
    h([90, 80, 70, 60]));
  prorythme(score, rnd(0, 15), deb2, fin2,
    gnotes(),
    0,
    lst(s(ldur4)),
    add(seq(0, 7, 2, 4), h([59, 63, 66, 69, 76])),
    h([90, 80, 70, 60]));
  prorythme(score, rnd(0, 15), deb2, fin2,
    gnotes(),
    0,
    lst(s(ldur5)),
    add(seq(0, 7, 2, 4), h([59, 63, 66, 69, 76])),
    h([90, 80, 70, 60]));
  prorythme(score, rnd(0, 15), deb2, fin2,
    gnotes(),
    0,
    lst(s(ldur6)),
    add(seq(0, 7, 2, 4), h([59, 63, 66, 69, 76])),
    h([90, 80, 70, 60]));
  // demi accord
  prorythme(score, 0, add(16, deb2), fin2,
    gnotes({ laccord: GACCORD_DEMI, lecar: GECAR }),
    0,
    [24],
    add(seq(0, 7, 2, 4), 47),
    25);
  // voix rares répétées
  shareGen('voix', rep(h([42, 48, 49]), rnd(3, 8)));
  prorythme(score, rnd(16, 23), deb2, fin2,
    gnotes({ proba: h([0, 0, 0, 1]) }),
    0,
    lst(s(ldur5)),
    useGen('voix'),
    30);
  prorythme(score, rnd(24, 31), deb2, fin2,
    gnotes({ proba: h([0, 0, 0, 1]) }),
    0,
    lst(s(ldur6)),
    useGen('voix'),
    30);
  freeGen('voix');
}

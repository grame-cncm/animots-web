/**
 * @file Séquence 31 (3' - 5').
 *
 * Généré par `npm run transpile` (transpiler/) depuis source/Gerland2013-4.lsp.
 * Ne pas modifier à la main : corriger le transpileur, puis régénérer.
 * tests/transpile.test.js vérifie que ce fichier est à jour.
 *
 * Commentaire d'origine :
 *     Séquence 31 (3' - 5')
 *     violons harmoniques lents, quasi synchrones et calmes          Multi M9
 *     version pour 16 points
 */

import { add, gnotes, h, L, lst, placeTempo, prorythme, rnd, s, seq } from '../../../core/index.js';
import { dateDur, glistedate, once, placeProg, printDialog, transfDat } from '../tools.js';
import { MULTIS } from '../config.js';

/**
 * Séquence 31.
 * Traduction de `(sequence-31 deb fin)`, lignes 4347 à 4429.
 * @param {import('../../../core/score.js').Score} score Partition où écrire.
 * @param {import('../../../core/generators.js').GenLike} deb Début (noires), tiré une fois.
 * @param {import('../../../core/generators.js').GenLike} fin Fin (noires), tirée une fois.
 * @returns {void}
 */
export function sequence31(score, deb, fin) {
  printDialog(score, 'SEQUENCE 31');
  // prog-change
  placeProg(score, 0, MULTIS.m9);
  placeTempo(score, 0, 60);
  const deb2 = once(deb);
  const fin2 = once(fin);
  const ldate1 = L(1, glistedate(deb2, fin2, h([12, 16, 8, 10, 4])))[0];
  const ldate2 = L(1, transfDat(ldate1, h([-4, -3.5, -3, -2.5, -2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5])))[0];
  const ldate3 = L(1, transfDat(ldate1, h([-4, -3.5, -3, -2.5, -2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5])))[0];
  const ldate4 = L(1, transfDat(ldate1, h([-4, -3.5, -3, -2.5, -2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5])))[0];
  const ldate5 = L(1, transfDat(ldate1, h([-4, -3.5, -3, -2.5, -2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5])))[0];
  const ldate6 = L(1, transfDat(ldate1, h([-4, -3.5, -3, -2.5, -2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5])))[0];
  const ldate7 = L(1, transfDat(ldate1, h([-4, -3.5, -3, -2.5, -2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5])))[0];
  const ldate8 = L(1, transfDat(ldate1, h([-4, -3.5, -3, -2.5, -2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5])))[0];
  const ldur1 = dateDur(ldate1);
  const ldur2 = dateDur(ldate2);
  const ldur3 = dateDur(ldate3);
  const ldur4 = dateDur(ldate4);
  const ldur5 = dateDur(ldate5);
  const ldur6 = dateDur(ldate6);
  const ldur7 = dateDur(ldate7);
  const ldur8 = dateDur(ldate8);
  prorythme(score, rnd(0, 7), deb2, fin2,
    gnotes(),
    5,
    lst(s(ldur1)),
    add(seq(0, 7, 2, 9, 0), h([55, 59, 62, 65, 67, 72])),
    50);
  prorythme(score, rnd(0, 7), deb2, fin2,
    gnotes(),
    5,
    lst(s(ldur2)),
    add(seq(0, 7, 2, 9, 0), h([55, 59, 62, 65, 67, 72])),
    50);
  prorythme(score, rnd(0, 7), deb2, fin2,
    gnotes(),
    5,
    lst(s(ldur3)),
    add(seq(0, 7, 2, 9, 0), h([55, 59, 62, 65, 67, 72])),
    50);
  prorythme(score, rnd(0, 7), deb2, fin2,
    gnotes(),
    5,
    lst(s(ldur4)),
    add(seq(0, 7, 2, 9, 0), h([55, 59, 62, 65, 67, 72])),
    50);
  prorythme(score, rnd(8, 15), deb2, fin2,
    gnotes(),
    5,
    lst(s(ldur5)),
    add(seq(0, 7, 2, 9, 0), h([55, 59, 62, 65, 67, 72])),
    50);
  prorythme(score, rnd(8, 15), deb2, fin2,
    gnotes(),
    5,
    lst(s(ldur6)),
    add(seq(0, 7, 2, 9, 0), h([55, 59, 62, 65, 67, 72])),
    50);
  prorythme(score, rnd(8, 15), deb2, fin2,
    gnotes(),
    5,
    lst(s(ldur7)),
    add(seq(0, 7, 2, 9, 0), h([55, 59, 62, 65, 67, 72])),
    50);
  prorythme(score, rnd(8, 15), deb2, fin2,
    gnotes(),
    5,
    lst(s(ldur8)),
    add(seq(0, 7, 2, 9, 0), h([55, 59, 62, 65, 67, 72])),
    50);
}

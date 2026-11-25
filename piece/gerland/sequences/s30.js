/**
 * @file Séquence 30 (3' - 6').
 *
 * Généré par `npm run transpile` (transpiler/) depuis source/Gerland2013-4.lsp.
 * Ne pas modifier à la main : corriger le transpileur, puis régénérer.
 * tests/transpile.test.js vérifie que ce fichier est à jour.
 *
 * Commentaire d'origine :
 *     Séquence 30 (3' - 6')
 *     Violons aléatoires alternés côte à côte          Multi M9
 *     version pour 16 points
 */

import { alt, gnotes, h, placeTempo, prorythme, rep, rnd } from '../../../core/index.js';
import { once, placeProg, printDialog } from '../tools.js';
import { MULTIS } from '../config.js';

/**
 * Séquence 30.
 * Traduction de `(sequence-30 deb fin)`, lignes 4265 à 4325.
 * @param {import('../../../core/score.js').Score} score Partition où écrire.
 * @param {import('../../../core/generators.js').GenLike} deb Début (noires), tiré une fois.
 * @param {import('../../../core/generators.js').GenLike} fin Fin (noires), tirée une fois.
 * @returns {void}
 */
export function sequence30(score, deb, fin) {
  printDialog(score, 'SEQUENCE 30');
  // prog-change
  placeProg(score, 0, MULTIS.m9);
  placeTempo(score, 0, 60);
  const deb2 = once(deb);
  const fin2 = once(fin);
  prorythme(score, alt(0, 1), deb2, fin2,
    gnotes(),
    h([6, 8, 10, 12, 14]),
    h([[10], [12], [14], [11], [16]]),
    rep(rnd(55, 79), rnd(1, 4)),
    50);
  prorythme(score, alt(2, 3), deb2, fin2,
    gnotes(),
    h([6, 8, 10, 12, 14]),
    h([[10], [12], [14], [11], [16]]),
    rep(rnd(55, 79), rnd(1, 4)),
    50);
  prorythme(score, alt(4, 5), deb2, fin2,
    gnotes(),
    h([6, 8, 10, 12, 14]),
    h([[10], [12], [14], [11], [16]]),
    rep(rnd(55, 79), rnd(1, 4)),
    50);
  prorythme(score, alt(6, 7), deb2, fin2,
    gnotes(),
    h([6, 8, 10, 12, 14]),
    h([[10], [12], [14], [11], [16]]),
    rep(rnd(55, 79), rnd(1, 4)),
    50);
  prorythme(score, alt(8, 9), deb2, fin2,
    gnotes(),
    h([6, 8, 10, 12, 14]),
    h([[10], [12], [14], [11], [16]]),
    rep(rnd(55, 79), rnd(1, 4)),
    50);
  prorythme(score, alt(10, 11), deb2, fin2,
    gnotes(),
    h([6, 8, 10, 12, 14]),
    h([[10], [12], [14], [11], [16]]),
    rep(rnd(55, 79), rnd(1, 4)),
    50);
  prorythme(score, alt(12, 13), deb2, fin2,
    gnotes(),
    h([6, 8, 10, 12, 14]),
    h([[10], [12], [14], [11], [16]]),
    rep(rnd(55, 79), rnd(1, 4)),
    50);
  prorythme(score, alt(14, 15), deb2, fin2,
    gnotes(),
    h([6, 8, 10, 12, 14]),
    h([[10], [12], [14], [11], [16]]),
    rep(rnd(55, 79), rnd(1, 4)),
    50);
}

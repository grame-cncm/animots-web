/**
 * @file Séquence 1 (1' - 4').
 *
 * Généré par `npm run transpile` (transpiler/) depuis source/Gerland2013-4.lsp.
 * Ne pas modifier à la main : corriger le transpileur, puis régénérer.
 * tests/transpile.test.js vérifie que ce fichier est à jour.
 *
 * Commentaire d'origine :
 *     Séquence 1 (1' - 4')
 *     Silence
 */

import { gnotes, lst, placeTempo, prorythme, sub } from '../../../core/index.js';
import { placeProg, printDialog } from '../tools.js';
import { MULTIS } from '../config.js';

/**
 * Séquence 1.
 * Traduction de `(sequence-1 deb fin)`, lignes 850 à 864.
 * @param {import('../../../core/score.js').Score} score Partition où écrire.
 * @param {import('../../../core/generators.js').GenLike} deb Début (noires), tiré une fois.
 * @param {import('../../../core/generators.js').GenLike} fin Fin (noires), tirée une fois.
 * @returns {void}
 */
export function sequence1(score, deb, fin) {
  printDialog(score, 'SEQUENCE 1');
  // prog-change
  placeProg(score, 0, MULTIS.m2);
  placeTempo(score, 0, 60);
  // silence
  prorythme(score, 0, deb, fin,
    gnotes(),
    0,
    lst(sub(fin, deb)),
    0,
    0);
}

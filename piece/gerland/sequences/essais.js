/**
 * @file Essais de la fenêtre de commande (Cercle1, Cercle2, Tutti, Alterne) et deux essais
 * de mise au point. Ce sont les outils de réglage des enceintes sur site.
 *
 * Généré par `npm run transpile` (transpiler/) depuis source/Gerland2013-4.lsp.
 * Ne pas modifier à la main : corriger le transpileur, puis régénérer.
 * tests/transpile.test.js vérifie que ce fichier est à jour.
 */

import { alt, gnotes, placeTempo, prorythme, rep, s, shift } from '../../../core/index.js';
import { placeProg, printDialog } from '../tools.js';
import { GACCORD, GECAR, MULTIS, TRAJ_TOTAL_DIRECT } from '../config.js';

/**
 * Essai « TEST » : un son sur les 8 premières enceintes à tour de rôle.
 * Traduction de `(test)`, lignes 666 à 679.
 * @param {import('../../../core/score.js').Score} score Partition où écrire.
 * @returns {void}
 */
export function essai(score) {
  printDialog(score, 'TEST');
  // prog-change
  placeProg(score, 0, MULTIS.m2);
  placeTempo(score, 0, 60);
  // silence
  prorythme(score, s([0, 1, 2, 3, 4, 5, 6, 7]), 0, 200,
    gnotes(),
    0,
    [1],
    69,
    80);
}

/**
 * Bouton « Cercle1 » : un son de percussion fait le tour des 16 enceintes.
 * Traduction de `(test1)`, lignes 697 à 710.
 * @param {import('../../../core/score.js').Score} score Partition où écrire.
 * @returns {void}
 */
export function cercle1(score) {
  printDialog(score, 'CERCLE1');
  // prog-change
  placeProg(score, 0, MULTIS.m2);
  placeTempo(score, 0, 60);
  // silence
  prorythme(score, s(TRAJ_TOTAL_DIRECT), 0, 1000,
    gnotes(),
    0,
    [1],
    69,
    80);
}

/**
 * Essai « TEST1BIS » : un son de percussion sur les 16 enceintes à la fois.
 * Traduction de `(test1bis)`, lignes 728 à 741.
 * @param {import('../../../core/score.js').Score} score Partition où écrire.
 * @returns {void}
 */
export function essai1bis(score) {
  printDialog(score, 'TEST1BIS');
  // prog-change
  placeProg(score, 0, MULTIS.m2);
  placeTempo(score, 0, 60);
  // silence
  prorythme(score, 0, 0, 800,
    gnotes({ laccord: GACCORD, lecar: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }),
    0,
    [1],
    69,
    80);
}

/**
 * Bouton « Cercle2 » : un son de tom fait le tour des 16 enceintes.
 * Traduction de `(test2)`, lignes 758 à 771.
 * @param {import('../../../core/score.js').Score} score Partition où écrire.
 * @returns {void}
 */
export function cercle2(score) {
  printDialog(score, 'CERCLE2');
  // prog-change
  placeProg(score, 0, MULTIS.m2);
  placeTempo(score, 0, 60);
  // silence
  prorythme(score, s(TRAJ_TOTAL_DIRECT), 0, 1000,
    gnotes(),
    0,
    [1],
    72,
    80);
}

/**
 * Bouton « Tutti » : un son de guiro sur les 16 enceintes à la fois.
 * Traduction de `(test3)`, lignes 788 à 801.
 * @param {import('../../../core/score.js').Score} score Partition où écrire.
 * @returns {void}
 */
export function tutti(score) {
  printDialog(score, 'TUTTI');
  // prog-change
  placeProg(score, 0, MULTIS.m2);
  placeTempo(score, 0, 60);
  // silence
  prorythme(score, 0, 0, 1000,
    gnotes({ laccord: GACCORD, lecar: GECAR }),
    0,
    [1],
    48,
    80);
}

/**
 * Bouton « Alterne » : pour chaque couple d’enceintes voisines, alterne 5 fois une clave (comparaison des niveaux).
 * Traduction de `(test4)`, lignes 821 à 834.
 * @param {import('../../../core/score.js').Score} score Partition où écrire.
 * @returns {void}
 */
export function alterne(score) {
  printDialog(score, 'ALTERNE');
  // prog-change
  placeProg(score, 0, MULTIS.m2);
  placeTempo(score, 0, 60);
  // silence
  prorythme(score, alt(rep(s(TRAJ_TOTAL_DIRECT), 5), rep(shift(1, s(TRAJ_TOTAL_DIRECT)), 5)), 0, 1000,
    gnotes(),
    2,
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    7,
    127);
}

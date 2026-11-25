/**
 * @file Données de Gerland2013-4.lsp (Animots, Parc de Gerland, version du 5 novembre 2013).
 *
 * Les numéros de canaux sont des « super-canaux » CLCE : 0 à 15 désignent le port A, canaux MIDI
 * 1 à 16 ; 16 à 31 le port B, canaux 1 à 16. D'après les commentaires du fichier (trajectoires
 * et groupes d'enceintes), le canal n de chaque port alimente l'enceinte n + 1.
 *
 * Les listes sont figées (`Object.freeze`) : les générateurs les copient avant de les consommer.
 */

import { selAl } from './tools.js';

/**
 * Multis (lignes 414 à 422) : pour chacun, le groupe Kontakt (valeur du CC9, de 1 à 6) envoyé
 * aux 16 canaux du port A, puis aux 16 canaux du port B, par `place-prog`.
 * Groupes : P1 guiro, percus, castagnettes, rivière ; P2 triangle tenu, faux insectes, rivière ;
 * P3 tenus nuit et jour, insectes, oiseaux, rivière ; P4 voix, Cécilia ; P5 voix, tenu jour court,
 * insectes, oiseaux ; P6 violons (en-tête du fichier, lignes 13 à 28).
 */
export const MULTIS = Object.freeze({
  m1: [1, 2], m2: [1, 3], m3: [1, 4], m4: [2, 3], m5: [2, 4],
  m6: [3, 4], m7: [1, 5], m8: [2, 5], m9: [6, 6],
});

/** Tempo de toutes les séquences, `(place-tempo 0 60)` : une noire dure une seconde. */
export const TEMPO = 60;

/** `*gaccord*` : écarts de canal d'un accord sur les 16 enceintes d'un port. */
export const GACCORD = Object.freeze([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);

/** `*gaccord-demi*` : écarts de canal d'un accord sur une enceinte sur deux (8 enceintes). */
export const GACCORD_DEMI = Object.freeze([0, 2, 4, 6, 8, 10, 12, 14]);

/** `*gecar*` : écarts de hauteur nuls pour les 16 notes d'un accord (même son partout). */
export const GECAR = Object.freeze(new Array(16).fill(0));

/** `*zone1*` : enceintes de la zone nord (numéros de canal, de 0 à 15). */
export const ZONE1 = Object.freeze([0, 1, 4, 8, 3, 2]);

/** `*zone2*` : enceintes de la zone centrale. */
export const ZONE2 = Object.freeze([5, 6, 7, 11, 10, 9]);

/** `*zone3*` : enceintes de la zone sud. */
export const ZONE3 = Object.freeze([12, 13, 15, 14]);

/** `*traj-total-direct*` : parcours des 16 enceintes, port A. */
export const TRAJ_TOTAL_DIRECT = Object.freeze([0, 1, 4, 5, 6, 7, 12, 13, 15, 14, 11, 10, 9, 8, 3, 2]);

/** `*traj-total-indirect*` : parcours des 16 enceintes dans l'autre sens, port A. */
export const TRAJ_TOTAL_INDIRECT = Object.freeze([2, 3, 8, 9, 10, 11, 14, 15, 13, 12, 7, 6, 5, 4, 1, 0]);

/** `*traj-total-direct2*` : parcours des 16 enceintes, port B. */
export const TRAJ_TOTAL_DIRECT2 = Object.freeze([16, 17, 20, 21, 22, 23, 28, 29, 30, 31, 27, 26, 25, 24, 19, 18]);

/** `*traj-total-indirect2*` : parcours des 16 enceintes dans l'autre sens, port B. */
export const TRAJ_TOTAL_INDIRECT2 = Object.freeze([18, 19, 24, 25, 26, 27, 31, 30, 29, 28, 23, 22, 21, 20, 17, 16]);

/** `*traj-zig-zag*` : parcours en zigzag, port A. */
export const TRAJ_ZIG_ZAG = Object.freeze([0, 2, 3, 1, 4, 8, 9, 5, 6, 10, 11, 7, 12, 14, 15, 14, 11, 7, 6, 10, 9, 5, 4, 8, 3, 1]);

/** `*traj-zig-zag2*` : parcours en zigzag, port B. */
export const TRAJ_ZIG_ZAG2 = Object.freeze([16, 18, 19, 17, 20, 24, 25, 21, 22, 26, 27, 23, 28, 30, 31, 30, 27, 23, 22, 26, 25, 21, 20, 24, 19, 17]);

/**
 * `(trajectoires)` : générateur qui tire une des 13 trajectoires au sol (port A) par `sel-al`
 * (version Gerland). Chaque appel de la fonction crée un nouveau générateur, comme en Lisp.
 * @returns {import('../../core/generators.js').Gen}
 */
export const trajectoires = () => selAl(12,
  [2, 3, 8, 9, 10, 11, 7, 6, 5, 4, 1, 0],
  [0, 1, 4, 5, 6, 7, 11, 10, 9, 8, 3, 2],
  [13, 12, 7, 6, 5, 4, 8, 9, 10, 11, 14, 15],
  [15, 14, 11, 10, 9, 8, 4, 5, 6, 7, 12, 13],
  [4, 5, 6, 7, 11, 10, 9, 8],
  [8, 9, 10, 11, 9, 6, 5, 4, 1, 0],
  [0, 2, 1, 3, 4, 8, 5, 9, 10, 11, 14, 15, 13, 12],
  [12, 13, 15, 14, 11, 10, 9, 5, 8, 4, 3, 1, 2, 0],
  [7, 6, 9, 8, 4, 1, 0, 2, 3, 5],
  [5, 3, 2, 0, 1, 4, 8, 9, 6, 7],
  [13, 12, 7, 6, 10, 11, 14, 15],
  [15, 14, 11, 10, 6, 7, 12, 13],
  [0, 1, 4, 5, 9, 8, 3, 2]);

/**
 * `(listgroupe)` : générateur qui tire un des 5 groupes d'enceintes rapprochées (port B).
 * Chaque appel de la fonction crée un nouveau générateur.
 * @returns {import('../../core/generators.js').Gen}
 */
export const listgroupe = () => selAl(4,
  [16, 17, 18, 19], [20, 21, 25, 24], [20, 21, 22, 23, 27, 26, 25, 24], [22, 23, 27, 26], [28, 29, 30, 31]);

/**
 * Liste épuisée par `hs` dans `g-parties` : l'indice k désigne `g-sequence-(k+1)`. 56 indices :
 * 34 séquences une fois, puis 22 une seconde fois (leur poids). Les séquences 17 et 22
 * (indices 16 et 21) n'y figurent plus depuis le 5 novembre 2013.
 */
export const PARTIES_INDICES = Object.freeze([
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 17, 18, 19, 20, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35,
  0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 13, 14, 15, 17, 19, 24, 25, 26, 32, 33, 34, 35,
]);

/**
 * Durée tirée pour chaque séquence dans `g-parties`, en noires (donc en secondes) :
 * `[min, max]` pour `(rnd °min °max)`. La séquence 1 est le silence.
 */
export const DUREES = Object.freeze({
  1: [60, 120], 2: [300, 600], 3: [300, 600], 4: [240, 540], 5: [300, 600], 6: [240, 480], 7: [240, 480],
  8: [240, 480], 9: [240, 480], 10: [240, 480], 11: [240, 540], 12: [240, 480], 13: [180, 480], 14: [180, 480],
  15: [120, 300], 16: [180, 360], 17: [120, 300], 18: [120, 240], 19: [240, 420], 20: [180, 360], 21: [120, 300],
  22: [120, 300], 23: [120, 300], 24: [180, 300], 25: [180, 360], 26: [180, 360], 27: [180, 360], 28: [240, 360],
  29: [180, 480], 30: [180, 360], 31: [180, 360], 32: [180, 240], 33: [180, 240], 34: [180, 300], 35: [180, 300],
  36: [180, 300],
});

/** Silence intercalé entre deux séquences, en noires : `(g-sequence-1 °0 °25)`. */
export const SILENCE_ENTRE_PARTIES = 25;

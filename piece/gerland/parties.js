/**
 * @file Enchaînement des parties : `g-parties`, `exec` et `calcul-partie` (Gerland2013-4.lsp,
 * lignes 338 à 361 et 616 à 655).
 *
 * L'installation alterne sans fin 25 secondes de silence et une séquence tirée au sort.
 * Le tirage `hs` épuise une liste de 56 indices où chaque séquence figure une ou deux fois,
 * avant de la reprendre : sur 56 parties, chaque séquence passe exactement son « poids ».
 * Les séquences 17 et 22 n'y figurent plus (5 novembre 2013).
 *
 * En Lisp, chaque `g-sequence-N` est un générateur dont l'appel écrit la séquence dans `*out*`.
 * Ici, le générateur rend une fonction d'écriture `(score) => void`, appelée aussitôt par
 * {@link calculPartie} : l'ordre des tirages est le même (choix de la séquence, puis tirages de
 * la séquence elle-même).
 */

import { G, alt, sel, hs, rnd, ctx, Score } from '../../core/index.js';
import { SEQUENCES } from './sequences/index.js';
import { PARTIES_INDICES, DUREES, SILENCE_ENTRE_PARTIES } from './config.js';

/**
 * Fonction qui écrit une partie dans une partition.
 * @callback PartWriter
 * @param {Score} score
 * @returns {void}
 */

/**
 * `(g-sequence-N deb fin)` : générateur constant d'une fonction d'écriture de la séquence N.
 * @param {number} n Numéro de la séquence.
 * @param {import('../../core/generators.js').GenLike} fin Fin (noires), évaluée par la séquence.
 * @returns {import('../../core/generators.js').Gen} Générateur d'un {@link PartWriter}.
 */
export const gSequence = (n, fin) => G((score) => SEQUENCES[n](score, G(0), fin));

/**
 * `(g-parties)` : générateur des parties. Chaque appel rend la fonction d'écriture de la partie
 * suivante : un silence de 25 noires, puis une séquence tirée par `hs`, et ainsi de suite.
 * @returns {import('../../core/generators.js').Gen} Générateur de {@link PartWriter}.
 * @example const parties = gParties(); const score = calculPartie(parties);
 */
export function gParties() {
  const choix = [];
  for (let n = 1; n <= 36; n++) choix.push(gSequence(n, rnd(...DUREES[n])));
  return alt(gSequence(1, SILENCE_ENTRE_PARTIES), sel(hs(PARTIES_INDICES), ...choix));
}

/**
 * `(calcul-partie gparties)` : partition neuve (`init`), puis écriture de la partie suivante
 * (`exec`). Comme en Lisp, où le calcul est enveloppé dans `ignore-errors`, une erreur ne
 * l'interrompt pas : la partition garde ce qui a été écrit avant l'erreur, qui est notée dans
 * `score.warnings`.
 *
 * `exec` appelle le générateur avec `(0 0 0 0)` : le dernier 0 vaut vrai en Lisp (temps
 * renversé), mais aucun générateur de ce niveau ne s'en sert ; le contexte est reproduit tel quel.
 * @param {import('../../core/generators.js').Gen} parties Générateur rendu par {@link gParties}.
 * @returns {Score} La partition de la partie, nommée par `score.label`.
 */
export function calculPartie(parties) {
  const score = new Score();
  try {
    parties(ctx(0, 0, 0, true))(score);
  } catch (e) {
    score.warnings.push(`erreur pendant le calcul de la partie (ignore-errors) : ${e.message}`);
  }
  return score;
}

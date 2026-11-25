/**
 * @file Aléa reproductible, à la place de `(random n)` de Common Lisp.
 *
 * Un seul état global, comme `*random-state*` en Lisp. `seed()` le fixe, pour rejouer une
 * partie ou rendre un test déterministe ; `getRandomState()` et `setRandomState()` permettent de
 * mémoriser l'état avant une partie et de la rejouer à l'identique.
 *
 * Le tirage ne reproduit PAS celui de LispWorks, ce qui est impossible : seule la loi de
 * probabilité est la même. Générateur : mulberry32 (32 bits, période 2^32), largement suffisant
 * pour des tirages musicaux. Sans appel à `seed()`, la graine dépend de l'heure de démarrage.
 */

let state = (Date.now() ^ 0x9e3779b9) >>> 0;

/**
 * Tirage suivant de mulberry32, uniforme dans [0, 1).
 * @returns {number}
 */
function next() {
  state = (state + 0x6d2b79f5) >>> 0;
  let t = state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/**
 * Fixe la graine.
 * @param {number} n Entier (ramené à 32 bits non signés).
 * @returns {void}
 */
export function seed(n) { state = n >>> 0; }

/**
 * État courant du générateur, à mémoriser pour rejouer ce qui suit.
 * @returns {number}
 */
export function getRandomState() { return state; }

/**
 * Restaure un état mémorisé par {@link getRandomState}.
 * @param {number} s
 * @returns {void}
 */
export function setRandomState(s) { state = s >>> 0; }

/**
 * `(random n)` : entier uniforme dans [0, n) si n est entier, flottant dans [0, n) sinon.
 * @param {number} n Strictement positif.
 * @returns {number}
 * @throws {RangeError} Si n <= 0 : `(random 0)` est une erreur en Lisp.
 */
export function random(n) {
  if (!(n > 0)) throw new RangeError(`(random ${n}): the argument must be a positive number`);
  const r = next();
  return Number.isInteger(n) ? Math.floor(r * n) : r * n;
}

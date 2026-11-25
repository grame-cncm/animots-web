/**
 * @file Sémantique Common Lisp dont dépend la fidélité du portage.
 *
 * Quelques opérations ne se comportent pas comme leurs homologues JavaScript : `round` arrondit
 * au pair, `mod` prend le signe du diviseur, `elt` signale une erreur hors de la séquence, la
 * division par zéro est une erreur, et seul NIL est faux (0 est vrai). Ce module les reproduit.
 *
 * Conventions : NIL est représenté par `null`, T par `true`. Une liste vide vaut aussi NIL.
 */

/** NIL de Lisp. */
export const NIL = null;

/** T de Lisp. */
export const T = true;

/**
 * Vrai si v vaut NIL au sens Lisp : null, undefined, false ou liste vide. 0 n'est PAS NIL.
 * @param {*} v
 * @returns {boolean}
 */
export function isNil(v) {
  return v === null || v === undefined || v === false || (Array.isArray(v) && v.length === 0);
}

/**
 * `ROUND` de Common Lisp : arrondi à l'entier le plus proche, au pair en cas d'égalité.
 * @param {number} x
 * @returns {number}
 * @example clRound(2.5) // 2 ; clRound(3.5) // 4 ; clRound(-2.5) // -2
 */
export function clRound(x) {
  const f = Math.floor(x);
  const d = x - f;
  if (d < 0.5) return f;
  if (d > 0.5) return f + 1;
  return f % 2 === 0 ? f : f + 1;
}

/**
 * `MOD` de Common Lisp : le résultat a le signe du diviseur.
 * @param {number} a Dividende.
 * @param {number} b Diviseur (non nul).
 * @returns {number}
 * @example clMod(-1, 16) // 15 (alors que -1 % 16 vaut -1)
 */
export function clMod(a, b) {
  if (b === 0) throw new RangeError('Division by zero (mod)');
  const r = a % b;
  return r !== 0 && (r < 0) !== (b < 0) ? r + b : r;
}

/**
 * `ELT` : élément d'indice i, avec une erreur si l'indice sort de la séquence (au lieu de
 * `undefined`). C'est cette erreur qu'affiche ReadMe.rtf pour `sel-al`.
 * @param {Array<any>} seq
 * @param {number} i
 * @returns {*}
 * @throws {RangeError} Si i n'est pas un indice valide.
 */
export function elt(seq, i) {
  if (!Number.isInteger(i) || i < 0 || i >= seq.length) {
    throw new RangeError(`The index ${i} is out of range for sequence of length ${seq.length}`);
  }
  return seq[i];
}

/**
 * `EQUAL` : égalité structurelle des listes ; NIL est égal à NIL quelle que soit sa forme.
 * @param {*} a
 * @param {*} b
 * @returns {boolean}
 */
export function clEqual(a, b) {
  if (isNil(a) && isNil(b)) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((x, k) => clEqual(x, b[k]));
  }
  return a === b;
}

/**
 * `+` variadique : `(+)` vaut 0.
 * @param {...number} a
 * @returns {number}
 */
export const plus = (...a) => a.reduce((x, y) => x + y, 0);

/**
 * `-` variadique : `(- x)` est l'opposé, `(- x y z)` vaut x - y - z.
 * @param {...number} a Au moins un nombre.
 * @returns {number}
 */
export const minus = (...a) => {
  if (a.length === 0) throw new TypeError('(-) requires at least one argument');
  return a.length === 1 ? -a[0] : a.slice(1).reduce((x, y) => x - y, a[0]);
};

/**
 * `*` variadique : `(*)` vaut 1.
 * @param {...number} a
 * @returns {number}
 */
export const times = (...a) => a.reduce((x, y) => x * y, 1);

/**
 * `/` variadique : `(/ x)` est l'inverse. Division par zéro en erreur, comme en Lisp.
 * Le résultat est flottant (rationnel exact en Lisp).
 * @param {...number} a Au moins un nombre.
 * @returns {number}
 * @throws {RangeError} Si un diviseur est nul.
 */
export const divide = (...a) => {
  if (a.length === 0) throw new TypeError('(/) requires at least one argument');
  const check = (y) => { if (y === 0) throw new RangeError('Division by zero'); return y; };
  return a.length === 1 ? 1 / check(a[0]) : a.slice(1).reduce((x, y) => x / check(y), a[0]);
};

/**
 * `REDUCE` sans valeur initiale. Liste vide : appelle f sans argument ; un seul élément : le rend.
 * @param {Function} f Fonction à deux arguments.
 * @param {Array<any>} list
 * @param {boolean} [fromEnd=false] Réduit par la droite (`:from-end t`).
 * @returns {*}
 * @example clReduce(minus, [10, 2, 3, 4, 5], true) // 12
 */
export function clReduce(f, list, fromEnd = false) {
  if (list.length === 0) return f();
  if (fromEnd) return list.slice(0, -1).reduceRight((acc, x) => f(x, acc), list[list.length - 1]);
  return list.slice(1).reduce((acc, x) => f(acc, x), list[0]);
}

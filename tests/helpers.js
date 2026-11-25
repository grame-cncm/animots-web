/**
 * @file Outils communs aux tests.
 */

import { ctx } from '../core/index.js';

/** Contexte neutre `(0 0 1 nil)`, celui de `(l 1 g)`. */
export const c0 = ctx(0, 0, 1, false);

/**
 * Compte les occurrences de chaque valeur.
 * @param {Array<any>} values
 * @returns {Map<any, number>}
 */
export function histogram(values) {
  const m = new Map();
  for (const v of values) m.set(v, (m.get(v) ?? 0) + 1);
  return m;
}

/**
 * Appelle n fois un générateur avec le contexte neutre.
 * @param {(c: object) => any} g
 * @param {number} n
 * @returns {Array<any>}
 */
export function draw(g, n) {
  const out = [];
  for (let k = 0; k < n; k++) out.push(g(c0));
  return out;
}

/**
 * Générateur espion : rend les valeurs de `values` en boucle et compte ses appels. Sert à
 * vérifier l'ordre et le nombre des évaluations.
 * @param {Array<any>} values
 * @param {Array<string>} [log] Journal partagé où inscrire `name` à chaque appel.
 * @param {string} [name]
 * @returns {((c: object) => any) & {calls: number}}
 */
export function spy(values, log, name) {
  let k = 0;
  const g = () => { g.calls++; if (log) log.push(name); return values[k++ % values.length]; };
  g.calls = 0;
  return g;
}

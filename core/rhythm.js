/**
 * @file Rythmes symboliques.
 *
 * Portage de `CODE-RYTHME`, `PREFIXPLUS`, `TRADUIT-DUR-SYMB`, `SPECIAL-EVALUATE`, `LONG-RYTHME`
 * (6Enigma.lisp), `DUR-MIDI` (4Processus.lisp), `CHANGDER` et de la coupe des liaisons de
 * `ACCORD` (3Note-Midi-Finale.lisp), et des générateurs de rythmes de 7Rythmes.lisp.
 *
 * ## Notation
 *
 * Un rythme est une liste d'éléments ; les durées sont en noires :
 *
 * | Lisp | JavaScript | Sens |
 * |------|------------|------|
 * | `1`, `1/2`, `-1/4` | `1`, `1/2`, `-1/4` | une note ; négatif : un silence |
 * | `+` | `'+'` | lie l'élément précédent au suivant |
 * | `2/3c (1/2 1/2 1/2)` | `t('2/3c', [1/2, 1/2, 1/2])` | un n-olet (ici un triolet de croches) |
 *
 * {@link parseRhythm} lit directement la notation Lisp : `parseRhythm('(2/3c (1/2 1/2 1/2))')`.
 *
 * ## Arithmétique
 *
 * Lisp calcule en rationnels exacts ; ce module calcule en flottants. Une durée n'est convertie
 * en ticks (5 040 par noire) que par {@link ticks}, qui absorbe l'erreur d'arrondi : `ticks(1/3)`
 * vaut 1680 exactement, comme `(floor (* noi 1/3))`.
 *
 * Non portés (inutilisés par Gerland) : `fusion`, `nfusion` et la gestion des silences `:sil`
 * dans les n-olets, qui relèvent de l'écriture des notes (phase 2).
 */

import { lift } from './generators.js';

/** `noi` : nombre de ticks par noire. Divisible par 2 à 10, 12, 14 et 16. */
export const PPQ = 5040;

/** Tolérance d'arrondi des conversions et comparaisons de durées. */
const EPS = 1e-6;

/**
 * `(floor (* noi (abs q)))` : convertit une durée en noires en ticks entiers.
 * @param {number} q Durée en noires (le signe est ignoré).
 * @returns {number}
 * @example ticks(1/3) // 1680 ; ticks(-1/2) // 2520
 */
export const ticks = (q) => Math.floor(Math.abs(q) * PPQ + EPS);

/**
 * Table de `TRADUIT-DUR-SYMB` : les seuls n-olets acceptés, avec leur rapport [num, den]. La
 * lettre finale (c croche, dc double croche, tc, qc, n noire, b blanche) ne sert qu'à Finale.
 */
export const TUPLETS = Object.freeze({
  '2/3c': [2, 3], '3/5c': [3, 5], '2/3dc': [2, 3], '3/5dc': [3, 5], '2/3tc': [2, 3], '2/3qc': [2, 3],
  '2/3n': [2, 3], '2/3b': [2, 3], '3/5n': [3, 5], '4/5n': [4, 5], '4/6n': [4, 6], '4/5c': [4, 5],
  '4/5dc': [4, 5], '4/5tc': [4, 5], '4/5qc': [4, 5], '4/6dc': [4, 6], '4/6c': [4, 6], '4/6tc': [4, 6],
  '4/6qc': [4, 6], '4/7dc': [4, 7], '4/7n': [4, 7], '4/7c': [4, 7], '4/7tc': [4, 7],
});

/**
 * Un n-olet de rythme.
 * @typedef {object} Tuplet
 * @property {string} tuplet Symbole, en minuscules (`'2/3c'`).
 * @property {number} ratio Rapport appliqué aux durées (2/3).
 * @property {Rhythm} items Rythme contenu.
 */

/**
 * Rythme symbolique : durées en noires, `'+'` et n-olets.
 * @typedef {Array<number | '+' | Tuplet>} Rhythm
 */

/**
 * Élément d'un rythme codé : la liste de ses parties liées, signées, en noires.
 * `[1]` est une noire, `[-2]` une pause de blanche, `[1, 1/3]` une noire liée à un tiers de noire.
 * @typedef {Array<number>} RhythmElement
 */

/**
 * Crée un n-olet.
 * @param {string} sym Symbole de la table {@link TUPLETS}, sans tenir compte de la casse.
 * @param {Rhythm} items Rythme contenu.
 * @returns {Tuplet}
 * @throws {Error} Si le symbole est inconnu (`undefined symbolic duration`, comme en Lisp).
 * @example t('2/3c', [1/2, 1/2, 1/2]) // triolet de croches, une noire au total
 */
export function t(sym, items) {
  const key = String(sym).toLowerCase();
  const nd = TUPLETS[key];
  if (!nd) throw new Error(`undefined symbolic duration : ${sym}`);
  if (!Array.isArray(items)) throw new Error(`wrong rythm : ${sym} must be followed by a list`);
  return { tuplet: key, ratio: nd[0] / nd[1], items };
}

/**
 * Lit un rythme écrit en notation Lisp. Accepte entiers, rationnels (`1/2`), décimaux (`0.25`),
 * `+` et symboles de n-olet suivis de leur liste, avec ou sans espace (`2/3c(1/2 1/2)`).
 * @param {string} text Rythme entre parenthèses.
 * @returns {Rhythm}
 * @throws {Error} Si le texte est mal formé.
 * @example parseRhythm('(1 + 2/3c (1/2 1/2 1/2) -2)') // [1, '+', t('2/3c', [0.5, 0.5, 0.5]), -2]
 */
export function parseRhythm(text) {
  const tokens = text.match(/\(|\)|[^\s()]+/g) ?? [];
  let pos = 0;
  const atom = (tok) => {
    if (tok === '+') return '+';
    if (/^[+-]?\d+$/.test(tok)) return Number(tok);
    if (/^[+-]?\d+\/\d+$/.test(tok)) { const [a, b] = tok.split('/').map(Number); return a / b; }
    if (/^[+-]?(\d+\.\d*|\.\d+)$/.test(tok)) return Number(tok);
    return { symbol: tok.toLowerCase() };
  };
  const list = () => {
    const out = [];
    while (pos < tokens.length) {
      const tok = tokens[pos++];
      if (tok === '(') out.push(list());
      else if (tok === ')') return out;
      else out.push(atom(tok));
    }
    throw new Error(`unbalanced rythm : ${text}`);
  };
  if (tokens[pos++] !== '(') throw new Error(`a rythm is a list : ${text}`);
  const raw = list();
  if (pos !== tokens.length) throw new Error(`unbalanced rythm : ${text}`);
  const build = (l) => {
    const out = [];
    for (let k = 0; k < l.length; k++) {
      const e = l[k];
      if (e && e.symbol !== undefined) {
        const next = l[k + 1];
        out.push(t(e.symbol, Array.isArray(next) ? build(next) : next));
        k++;
      } else if (Array.isArray(e)) throw new Error('wrong rythm : a list must follow a tuplet symbol');
      else out.push(e);
    }
    return out;
  };
  return build(raw);
}

/**
 * `CODE-RYTHME` : aplatit les n-olets (chaque durée est multipliée par les rapports qui
 * l'englobent) et garde les `'+'`. Une liste nue qui ne suit pas un symbole de n-olet est
 * refusée ; en Lisp elle passerait sans erreur mais donnerait une durée incohérente.
 * @param {Rhythm} r
 * @param {number} [k=1] Rapport courant (usage interne de la récursion).
 * @param {Array<number|'+'>} [out=[]] Accumulateur (usage interne).
 * @returns {Array<number|'+'>}
 * @example codeRhythm([t('2/3c', [1/2, 1/2, 1/2])]) // [1/3, 1/3, 1/3]
 */
export function codeRhythm(r, k = 1, out = []) {
  if (!Array.isArray(r)) throw new Error(`wrong rythm : ${JSON.stringify(r)}`);
  for (const e of r) {
    if (typeof e === 'number') out.push(e * k);
    else if (e === '+') out.push('+');
    else if (e && e.tuplet) codeRhythm(e.items, k * e.ratio, out);
    else throw new Error(`wrong rythm : ${JSON.stringify(e)}`);
  }
  return out;
}

/**
 * `PREFIXPLUS` : regroupe les durées liées par `'+'` en éléments.
 * @param {Array<number|'+'>} flat Sortie de {@link codeRhythm}.
 * @returns {Array<RhythmElement>}
 * @example prefixPlus([1, '+', 1/3, -2]) // [[1, 1/3], [-2]]
 */
export function prefixPlus(flat) {
  const out = [];
  for (let k = 0; k < flat.length; k++) {
    if (flat[k] === '+') throw new Error('wrong rythm : misplaced +');
    const parts = [flat[k]];
    while (flat[k + 1] === '+') {
      if (typeof flat[k + 2] !== 'number') throw new Error('wrong rythm : + must be followed by a duration');
      parts.push(flat[k + 2]);
      k += 2;
    }
    out.push(parts);
  }
  return out;
}

/**
 * Éléments d'un rythme, dans l'ordre où `prorythme` les joue : `prefixPlus(codeRhythm(r))`.
 * @param {Rhythm} r
 * @returns {Array<RhythmElement>}
 */
export const elements = (r) => prefixPlus(codeRhythm(r));

/**
 * `SPECIAL-EVALUATE` d'un élément : somme des valeurs absolues de ses parties, en noires. C'est
 * la durée dont le curseur avance.
 * @param {RhythmElement} e
 * @returns {number}
 */
export const elementDuration = (e) => e.reduce((a, d) => a + Math.abs(d), 0);

/**
 * `DUR-MIDI` : durée totale d'un rythme en noires, silences compris.
 * @param {Rhythm} r
 * @returns {number}
 * @example durMidi(parseRhythm('(1 + 2/3c (1/2 2/3dc (-1/2 1/4) + 1/2) -2 4)')) // 8 (exemple Lisp)
 */
export const durMidi = (r) => elements(r).reduce((a, e) => a + elementDuration(e), 0);

/**
 * `LONG-RYTHME` : nombre d'éléments (notes et silences, liaisons regroupées).
 * @param {Rhythm} r
 * @returns {number}
 */
export const longRythme = (r) => elements(r).length;

/**
 * `CHANGDER` : transforme un élément en silence de même durée (utilisé quand `proba` vaut 0).
 * @param {RhythmElement} e
 * @returns {RhythmElement}
 */
export const toRest = (e) => e.map((d) => -Math.abs(d));

/**
 * Vrai si l'élément est un silence : somme signée négative, comme le test `(< (eval dur) 0)`
 * de `NOTE-MOTIF`.
 * @param {RhythmElement} e
 * @returns {boolean}
 */
export const isRest = (e) => e.reduce((a, d) => a + d, 0) < 0;

/**
 * Durées effectivement jouées pour un élément, comme dans `ACCORD`. Une liaison `(+ a b)` est
 * coupée en deux si a est négatif ou si la somme de b l'est (`SIGN`) ; sinon elle donne une
 * seule note de durée a + b.
 * @param {RhythmElement} e
 * @returns {Array<number>} Durées signées (négatif : silence).
 * @example segments([1, 1/2]) // [1.5] ; segments([1, -1/2]) // [1, -0.5]
 */
export function segments(e) {
  if (e.length === 1) return [e[0]];
  const [a, ...rest] = e;
  const restSum = rest.reduce((x, d) => x + d, 0);
  if (a < 0 || restSum < 0) return [a, ...segments(rest)];
  return [a + restSum];
}

// ________________________________________________________ générateurs de rythmes (7Rythmes.lisp)

/**
 * Concatène une liste de listes (`append`).
 * @param {Array<Array<any>>} lists
 * @returns {Array<any>}
 */
const append = (lists) => [].concat(...lists);

/**
 * `(concat r...)` : concatène les rythmes (évalués de gauche à droite).
 * @param {...import('./generators.js').GenLike} l Rythmes ou générateurs de rythmes.
 * @returns {import('./generators.js').Gen}
 * @example concat([1/2], [1/8, 1/8], [4])(c) // [1/2, 1/8, 1/8, 4]
 */
export const concat = (...l) => { l = l.map(lift); return (c) => append(l.map((g) => g(c))); };

/**
 * `(nconcat n r)` : concatène n tirages successifs de r (n est évalué d'abord).
 * @param {import('./generators.js').GenLike} n Nombre de tirages.
 * @param {import('./generators.js').GenLike} rytm Générateur de rythmes.
 * @returns {import('./generators.js').Gen}
 */
export const nconcat = (n, rytm) => {
  n = lift(n); rytm = lift(rytm);
  return (c) => { const k = n(c), out = []; for (let j = 0; j < k; j++) out.push(...rytm(c)); return out; };
};

/**
 * `(nconcat-spe n r)` : r tiré une seule fois (avant n), répété n fois.
 * @param {import('./generators.js').GenLike} n Nombre de copies.
 * @param {import('./generators.js').GenLike} rytm Générateur de rythmes.
 * @returns {import('./generators.js').Gen}
 */
export const nconcatSpe = (n, rytm) => {
  n = lift(n); rytm = lift(rytm);
  return (c) => { const r = rytm(c), k = n(c), out = []; for (let j = 0; j < k; j++) out.push(...r); return out; };
};

/**
 * Vrai si une durée est entière, à l'erreur d'arrondi près.
 * @param {number} d
 * @returns {boolean}
 */
const isWhole = (d) => Math.abs(d - Math.round(d)) < EPS;

/**
 * `(nconcat-spe2 n r)` : comme {@link nconcatSpe}, puis complète d'une durée jusqu'à la noire
 * entière suivante.
 * @param {import('./generators.js').GenLike} n Nombre de copies.
 * @param {import('./generators.js').GenLike} rytm Générateur de rythmes.
 * @returns {import('./generators.js').Gen}
 * @example nconcatSpe2(9, [1/4])(c) // neuf 1/4 puis 3/4 (exemple Lisp)
 */
export const nconcatSpe2 = (n, rytm) => {
  n = lift(n); rytm = lift(rytm);
  return (c) => {
    const r = rytm(c), k = n(c), out = [];
    for (let j = 0; j < k; j++) out.push(...r);
    const d = durMidi(out);
    return isWhole(d) ? out : [...out, 1 + Math.trunc(d) - d];
  };
};

/**
 * `(nconcat-spe3 r1 r2)` : remplit la durée de r1 avec des copies de r2, plus le reste.
 * Ordre : r2, puis r1.
 * @param {import('./generators.js').GenLike} r1 Rythme qui donne la durée à remplir.
 * @param {import('./generators.js').GenLike} r2 Rythme répété.
 * @returns {import('./generators.js').Gen}
 */
export const nconcatSpe3 = (r1, r2) => {
  r1 = lift(r1); r2 = lift(r2);
  return (c) => {
    const rrr2 = r2(c);
    const rr1 = durMidi(r1(c)), rr2 = durMidi(rrr2);
    const q = Math.trunc(rr1 / rr2), rest = rr1 - q * rr2, out = [];
    for (let j = 0; j < q; j++) out.push(...rrr2);
    return rest > EPS ? [...out, rest] : out;
  };
};

/**
 * `(concat-list l)` : concatène la liste de rythmes rendue par l.
 * @param {import('./generators.js').GenLike} l Générateur d'une liste de rythmes.
 * @returns {import('./generators.js').Gen}
 * @example concatList(lst([1, 2, 3], [10, 20]))(c) // [1, 2, 3, 10, 20] (exemple Lisp)
 */
export const concatList = (l) => { l = lift(l); return (c) => append(l(c)); };

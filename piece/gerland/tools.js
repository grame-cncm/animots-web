/**
 * @file Outils définis dans Gerland2013-4.lsp (lignes 447 à 569).
 *
 * Comme en Lisp, où le fichier est chargé après la bibliothèque, ces définitions masquent celles
 * de même nom : le `selAl` de ce module remplace celui de `core/paj.js` pour Gerland.
 *
 * `i` (« Correction bug interpolation », ligne 562) n'est pas repris : il est identique à celui
 * de la bibliothèque (`core/generators.js`).
 */

import { lift, G, L, s, h, rep, greplie, add, random, elt } from '../../core/index.js';

/** @typedef {import('../../core/generators.js').Gen} Gen */
/** @typedef {import('../../core/generators.js').GenLike} GenLike */

/**
 * `(xconcat n rytm)` : le rythme est tiré UNE fois (avant n), puis répété n fois.
 * À ne pas confondre avec `nconcat` (bibliothèque), qui tire n fois.
 * @param {GenLike} n Nombre de copies.
 * @param {GenLike} rytm Générateur de rythmes.
 * @returns {Gen}
 * @example xconcat(3, selAl(4, [1/2], [1], [3/2], [3], [5]))(c) // [1, 1, 1], ou [3, 3, 3], etc.
 */
export const xconcat = (n, rytm) => {
  n = lift(n); rytm = lift(rytm);
  return (c) => { const v = rytm(c), k = n(c), out = []; for (let j = 0; j < k; j++) out.push(...v); return out; };
};

/**
 * `(sel-al g1 g...)` redéfini par Gerland (ligne 453) : évalue l'alternative d'indice
 * `min(nombre - 1, (random (max 0 (1+ g1))))`. Le bornage corrige le débordement de la version
 * de la bibliothèque. Si g1 dépasse le nombre d'alternatives, la dernière devient plus probable.
 * `(random 0)` reste une erreur, comme en Lisp, si `1 + g1 <= 0`.
 * @param {GenLike} g1 Indice maximal tiré (peut varier dans le temps : `floo(i(6, 0))`).
 * @param {...GenLike} lg Alternatives.
 * @returns {Gen}
 */
export const selAl = (g1, ...lg) => {
  g1 = lift(g1); lg = lg.map(lift);
  return (c) => {
    const val = 1 + g1(c);
    return elt(lg, Math.min(lg.length - 1, random(Math.max(0, val))))(c);
  };
};

/**
 * `(traj gtraj gnum)` : liste de gnum numéros d'enceintes qui parcourt en boucle UN chemin tiré
 * dans gtraj : `(l §gnum (s (s (g (l 1 gtraj)))))`. gnum est évalué avant gtraj. Un nouveau
 * chemin est tiré à chaque appel.
 * @param {GenLike} gtraj Générateur de chemins (par exemple `trajectoires()`).
 * @param {GenLike} gnum Longueur de la liste.
 * @returns {Gen}
 * @example traj([0, 1, 2], 5)(c) // [0, 1, 2, 0, 1] (un chemin constant)
 */
export const traj = (gtraj, gnum) => {
  gtraj = lift(gtraj); gnum = lift(gnum);
  return (c) => { const n = gnum(c); return L(n, s(s(G(L(1, gtraj))))); };
};

/**
 * `(groupe ggroup gnum gval)` : gnum enceintes tirées au hasard dans UN groupe tiré par ggroup,
 * chacune répétée gval fois : `(l §gnum (rep (h (s (g (l 1 ggroup)))) gval))`.
 * @param {GenLike} ggroup Générateur de groupes (par exemple `listgroupe()`).
 * @param {GenLike} gnum Longueur de la liste.
 * @param {GenLike} gval Nombre de répétitions de chaque enceinte.
 * @returns {Gen}
 */
export const groupe = (ggroup, gnum, gval) => {
  ggroup = lift(ggroup); gnum = lift(gnum); gval = lift(gval);
  return (c) => { const n = gnum(c); return L(n, rep(h(s(G(L(1, ggroup)))), gval)); };
};

/**
 * `(nconcat-spe4 n val)` : liste de n valeurs de val, avec le contexte de l'appelant.
 * @param {GenLike} n Nombre de valeurs.
 * @param {GenLike} val Générateur des valeurs.
 * @returns {Gen}
 * @example nconcatSpe4(8, hs([0, 1, 2, … 15]))(c) // 8 canaux distincts
 */
export const nconcatSpe4 = (n, val) => {
  n = lift(n); val = lift(val);
  return (c) => { const k = n(c), out = []; for (let j = 0; j < k; j++) out.push(val(c)); return out; };
};

/**
 * `(list-nvaleur n v)` : `(l n v)`. v est donc appelé avec `(0 i n nil)`, et non avec le
 * contexte de l'appelant.
 * @param {GenLike} n Nombre de valeurs.
 * @param {GenLike} v Générateur des valeurs.
 * @returns {Gen}
 */
export const listNvaleur = (n, v) => { n = lift(n); v = lift(v); return (c) => L(n(c), v); };

/**
 * `(glist n v min max)` : n valeurs de v repliées dans [min, max] (voir `greplie`).
 * @param {GenLike} n Nombre de valeurs.
 * @param {GenLike} v Générateur des valeurs.
 * @param {GenLike} min
 * @param {GenLike} max
 * @returns {Gen}
 * @example glist(3, rnd(10, 20), 30, 40)(c) // par exemple [36, 39, 30]
 */
export const glist = (n, v, min, max) => { n = lift(n); return (c) => L(n(c), greplie(v, min, max)); };

/**
 * `(glistedate t1 t2 v)` : dates de t1 à t2 incluses, par pas de v (v est évalué après chaque
 * date, comme le pas d'une boucle `do`).
 * @param {GenLike} t1 Première date.
 * @param {GenLike} t2 Date limite.
 * @param {GenLike} v Pas.
 * @returns {Gen}
 * @example glistedate(0, 10, alt(1, 3))(c) // [0, 1, 4, 5, 8, 9] (exemple Lisp)
 */
export const glistedate = (t1, t2, v) => {
  t1 = lift(t1); t2 = lift(t2); v = lift(v);
  return (c) => {
    const tt1 = t1(c), tt2 = t2(c), out = [];
    for (let k = tt1; !(k > tt2); k += v(c)) out.push(k);
    return out;
  };
};

/**
 * `(glistedur t1 t2 v)` : une durée de v par pas de v entre t1 et t2. v est évalué une fois par
 * pas pendant la boucle, PUIS une fois par durée rendue (les durées rendues ne sont donc pas les
 * pas de la boucle).
 * @param {GenLike} t1 Première date.
 * @param {GenLike} t2 Date limite.
 * @param {GenLike} v Pas et durées.
 * @returns {Gen}
 * @example glistedur(0, 10, alt(1, 3))(c) // [1, 3, 1, 3, 1, 3] (exemple Lisp)
 */
export const glistedur = (t1, t2, v) => {
  t1 = lift(t1); t2 = lift(t2); v = lift(v);
  return (c) => {
    const tt1 = t1(c), tt2 = t2(c);
    let count = 0;
    for (let k = tt1; !(k > tt2); k += v(c)) count++;
    const out = [];
    for (let j = 0; j < count; j++) out.push(v(c));
    return out;
  };
};

/**
 * `(date-dur l)` : transforme une liste de dates en liste de durées (écarts successifs).
 * @param {Array<number>} l Dates croissantes.
 * @returns {Array<number>}
 * @example dateDur([0, 2, 6, 12, 20, 22, 26]) // [2, 4, 6, 8, 2, 4] (exemple Lisp)
 */
export const dateDur = (l) => l.slice(1).map((d, k) => d - l[k]);

/**
 * `(transf-dat l v)` : ajoute à chaque date une valeur de v. Comme en Lisp, v est évalué en
 * partant de la DERNIÈRE date.
 * @param {Array<number>} l Dates.
 * @param {GenLike} v Générateur des décalages.
 * @returns {Gen}
 * @example transfDat([0, 2, 6], h([-0.1, 0, 0.1]))(c) // par exemple [0.1, 1.9, 6]
 */
export const transfDat = (l, v) => {
  v = lift(v);
  return (c) => {
    const out = new Array(l.length);
    for (let k = l.length - 1; k >= 0; k--) out[k] = add(v, G(l[k]))(c);
    return out;
  };
};

/**
 * `(g (car (l 1 deb)))` : fige la valeur d'un générateur en un générateur constant. Les
 * séquences l'utilisent pour tirer une seule fois leur début et leur fin.
 * @param {GenLike} g
 * @returns {Gen}
 */
export const once = (g) => G(L(1, g)[0]);


/**
 * @file Générateurs fonctionnels temporels.
 *
 * Portage de CLCE `3-XTD-CLCE/3-TimeGenerator/1-TimeGenerators.lisp` (YO/GRAME, 1993-2001).
 *
 * ## Le modèle
 *
 * En Lisp, un générateur est une fermeture `#'(lambda (stime ctime etime reverse) ...)` qui peut
 * garder un état local (position dans une liste, compteur de répétitions...). Chaque appel rend
 * une valeur. Les quatre arguments décrivent le temps :
 *
 * - `stime` : date de début du processus qui appelle le générateur ;
 * - `ctime` : date courante (ou indice, quand le collecteur `L` appelle) ;
 * - `etime` : date de fin ;
 * - `reverse` : temps renversé (voir {@link rev}).
 *
 * En JavaScript, un générateur est une fonction `(ctx) => valeur`, où `ctx` regroupe ces quatre
 * champs (voir {@link ctx}). Les deux macros-caractères de CLCE deviennent :
 *
 * | Lisp | JavaScript |
 * |------|------------|
 * | `°x`, `°(1 2 3)` (générateur constant) | `x`, `[1, 2, 3]` : toute valeur qui n'est pas une fonction est convertie par {@link lift} ; ou `G(x)` |
 * | `§g` (évaluer un générateur) | `g(ctx)` |
 *
 * Pour passer une FONCTION comme valeur (`°+` en Lisp), il faut l'envelopper : `G((a, b) => a + b)`,
 * sinon elle serait prise pour un générateur.
 *
 * ## Fidélité
 *
 * Beaucoup de générateurs ont un état. Le nombre et l'ordre de leurs évaluations changent donc
 * les valeurs produites. Chaque fonction de ce module évalue ses arguments dans l'ordre du Lisp
 * (arguments de gauche à droite, formes d'un `LET` dans l'ordre). Les arrondis (`round` au pair),
 * modulos (signe du diviseur) et erreurs d'indice suivent Common Lisp (voir `lisp.js`).
 *
 * Non porté : rien. `pblk` prend des chaînes pour symboles.
 */

import { NIL, T, isNil, clRound, clMod, elt, clEqual, plus, minus, times, divide, clReduce } from './lisp.js';
import { random } from './random.js';

/**
 * Contexte temporel passé à chaque générateur.
 * @typedef {object} Ctx
 * @property {number} stime Date de début du processus (ticks), ou 0 pour {@link L}.
 * @property {number} ctime Date courante (ticks), ou indice de la valeur pour {@link L}.
 * @property {number} etime Date de fin du processus (ticks), ou nombre de valeurs pour {@link L}.
 * @property {boolean} reverse Temps renversé.
 */

/**
 * Générateur : fonction appelée avec un {@link Ctx}, qui rend une valeur.
 * @typedef {(c: Ctx) => any} Gen
 */

/**
 * Générateur ou valeur constante (convertie par {@link lift}).
 * @typedef {Gen | number | boolean | null | Array<any> | object} GenLike
 */

/**
 * Construit un contexte temporel.
 * @param {number} stime Date de début.
 * @param {number} ctime Date courante.
 * @param {number} etime Date de fin.
 * @param {boolean} [reverse=false] Temps renversé.
 * @returns {Ctx}
 */
export const ctx = (stime, ctime, etime, reverse = false) => ({ stime, ctime, etime, reverse });

/**
 * `(g x)` ou `°x` : générateur constant.
 * @param {*} x Valeur rendue à chaque appel (peut être une fonction).
 * @returns {Gen}
 * @example G(5)(ctx(0, 0, 1)) // 5
 */
export const G = (x) => () => x;

/**
 * Convertit en générateur constant toute valeur qui n'est pas une fonction ; laisse les fonctions
 * telles quelles. Équivalent de l'écriture `°x` pour les arguments.
 * @param {GenLike} x
 * @returns {Gen}
 */
export const lift = (x) => (typeof x === 'function' ? x : G(x));

// ________________________________________________________ collecteurs

/**
 * `(l n g)` : collecte n valeurs. Le générateur est appelé avec `(0 i n nil)`, donc l'indice i
 * tient lieu de date courante : `(l 4 (i °0 °4))` rend `(0 1 2 3)`.
 * @param {number} n Nombre de valeurs.
 * @param {GenLike} g Générateur.
 * @returns {Array<any>}
 * @example L(3, s([1, 2])) // [1, 2, 1]
 */
export function L(n, g) {
  g = lift(g);
  const out = [];
  for (let k = 0; k < n; k++) out.push(g(ctx(0, k, n, false)));
  return out;
}

/**
 * `(take n g)` : évalue n fois le générateur et rend la dernière valeur.
 * @param {number} n Rang de la valeur (à partir de 1).
 * @param {GenLike} g Générateur.
 * @returns {*}
 */
export function take(n, g) {
  g = lift(g);
  for (let k = 0; k < n - 1; k++) g(ctx(0, k, n, false));
  return g(ctx(0, n - 1, n, false));
}

// ________________________________________________________ générateurs simples

/**
 * `(lst g...)` : rend la liste des valeurs des générateurs, évalués de gauche à droite.
 * @param {...GenLike} lg Générateurs.
 * @returns {Gen} Générateur de tableaux.
 * @example lst(1, rnd(0, 9))(c) // [1, 7]
 */
export const lst = (...lg) => { lg = lg.map(lift); return (c) => lg.map((g) => g(c)); };

/**
 * `(appl g1 g2)` : `(apply §g1 §g2)`. g1 est évalué avant g2.
 * @param {GenLike} g1 Générateur qui rend une fonction (envelopper une fonction dans `G`).
 * @param {GenLike} g2 Générateur qui rend la liste des arguments.
 * @returns {Gen}
 * @example appl(G(Math.max), [3, 8, 2])(c) // 8
 */
export const appl = (g1, g2) => { g1 = lift(g1); g2 = lift(g2); return (c) => { const f = g1(c); return f(...g2(c)); }; };

/**
 * `(call g g1 g2...)` : `(appl g (lst g1 g2...))`.
 * @param {GenLike} g Générateur qui rend une fonction.
 * @param {...GenLike} lg Générateurs des arguments.
 * @returns {Gen}
 */
export const call = (g, ...lg) => appl(g, lst(...lg));

// ________________________________________________________ fonctions sur les nombres

/**
 * `(proba n)` : vrai avec la probabilité n. Tire `(random 1000)`.
 * @param {number} n Probabilité entre 0 et 1.
 * @returns {boolean}
 */
export const proba = (n) => n * 1000 > random(1000);

/**
 * `(alea n e)` : ajoute à n un entier aléatoire de [-e, e].
 * @param {number} nn Valeur de départ.
 * @param {number} e Écart maximal (entier positif ; 0 rend nn sans tirage).
 * @returns {number}
 */
export const alea = (nn, e) => (e === 0 ? nn : nn - e + random(2 * e + 1));

/**
 * `(constraint x min max)` : borne x dans [min, max] ; à l'intérieur, arrondi au pair (`round`).
 * @param {number} x
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export const constraint = (x, min, max) => (x < min ? min : x > max ? max : clRound(x));

/**
 * `(replie x min max)` : replie x dans [min, max] par réflexion sur les bornes, puis arrondit.
 * @param {number} x
 * @param {number} min
 * @param {number} max
 * @returns {number}
 * @example replie(12, 0, 10) // 8
 */
export function replie(x, min, max) {
  for (;;) {
    if (x < min) x = min + min - x;
    else if (x > max) x = max + max - x;
    else return clRound(x);
  }
}

/**
 * `(sisyphe x min max ecart)` : ramène x dans [min, max] par pas de `ecart`, puis arrondit.
 * @param {number} x
 * @param {number} min
 * @param {number} max
 * @param {number} ecart Pas (positif).
 * @returns {number}
 */
export function sisyphe(x, min, max, ecart) {
  for (;;) {
    if (x < min) x += ecart;
    else if (x > max) x -= ecart;
    else return clRound(x);
  }
}

/**
 * `(tore x min max)` : ramène x dans [min, max] par enroulement (tore) : au-delà de max, on
 * repart de min, avec une période de `max - min`. Calcul du Lisp : `vv = (mod (- x min) 2d)`,
 * puis `max - (2d - vv)` si vv > d, `min + vv` sinon (d = max - min). Les deux bornes sont
 * atteintes.
 * @param {number} x
 * @param {number} min
 * @param {number} max
 * @returns {number}
 * @example tore(6, 0, 5) // 1 (exemple du source Lisp) ; tore(-1, 0, 5) // 4
 */
export function tore(x, min, max) {
  if (min === max) return min;
  const d = max - min, d2 = d + d, vv = clMod(x - min, d2);
  return vv > d ? max - (d2 - vv) : min + vv;
}

// ________________________________________________________ générateurs temporels de base

/**
 * `(sync gst gct get grev g)` : appelle g avec un contexte calculé par quatre générateurs.
 * @param {GenLike} gst Date de début.
 * @param {GenLike} gct Date courante.
 * @param {GenLike} get Date de fin.
 * @param {GenLike} grev Renversement.
 * @param {GenLike} g Générateur synchronisé.
 * @returns {Gen}
 */
export const sync = (gst, gct, get, grev, g) => {
  [gst, gct, get, grev, g] = [gst, gct, get, grev, g].map(lift);
  return (c) => g(ctx(gst(c), gct(c), get(c), grev(c)));
};

/**
 * `(stime)` : générateur de la date de début.
 * @returns {Gen}
 */
export const stime = () => (c) => c.stime;

/**
 * `(ctime)` : générateur de la date courante.
 * @returns {Gen}
 */
export const ctime = () => (c) => c.ctime;

/**
 * `(etime)` : générateur de la date de fin.
 * @returns {Gen}
 */
export const etime = () => (c) => c.etime;

/**
 * `(isreverse?)` : générateur du renversement du temps.
 * @returns {Gen}
 */
export const isreverse = () => (c) => c.reverse;

// ________________________________________________________ générateurs temporels dérivés

/**
 * `(boucle g)` : ramène la date courante dans [stime, etime) par modulo, ce qui fait boucler g.
 * @param {GenLike} g
 * @returns {Gen}
 */
export const boucle = (g) => {
  g = lift(g);
  return (c) => g(ctx(c.stime, c.stime + clMod(c.ctime - c.stime, c.etime - c.stime), c.etime, c.reverse));
};

/**
 * `(i g1 g2)` : interpolation linéaire de la valeur de g1 (à stime) à celle de g2 (à etime).
 * Calcul fait dans l'ordre du Lisp (produits puis division) pour rester exact sur des entiers.
 * Avec reverse, g2 est évalué avant g1.
 * @param {GenLike} g1 Valeur de départ.
 * @param {GenLike} g2 Valeur d'arrivée.
 * @returns {Gen}
 * @example L(5, i(0, 10)) // [0, 2, 4, 6, 8]
 */
export const i = (g1, g2) => {
  g1 = lift(g1); g2 = lift(g2);
  return (c) => {
    const v1 = c.reverse ? g2(c) : g1(c);
    const v2 = c.reverse ? g1(c) : g2(c);
    if (c.etime === c.stime) return v1;
    return (v1 * (c.etime - c.ctime) + v2 * (c.ctime - c.stime)) / (c.etime - c.stime);
  };
};

/**
 * `(ntime)` : temps normalisé, de 0 (à stime) à 1 (à etime).
 * @returns {Gen}
 */
export const ntime = () => i(0, 1);

/**
 * `(rev g)` : appelle g avec le temps renversé.
 * @param {GenLike} g
 * @returns {Gen}
 */
export const rev = (g) => { g = lift(g); return (c) => g(ctx(c.stime, c.ctime, c.etime, !c.reverse)); };

/**
 * `(trep gr g)` : répète le temps : g (bouclé) est parcouru gr fois plus vite.
 * @param {GenLike} gr Facteur de répétition.
 * @param {GenLike} g
 * @returns {Gen}
 */
export const trep = (gr, g) => {
  gr = lift(gr); g = boucle(g);
  return (c) => g(ctx(c.stime, c.ctime * gr(c), c.etime, c.reverse));
};

/**
 * `(seq g...)` : découpe [stime, etime] en parts égales, une par générateur, et appelle le
 * générateur de la part courante avec un temps local. Rend NIL hors de l'intervalle
 * (version du 21 septembre 2012).
 * @param {...GenLike} lg Générateurs, dans l'ordre du temps.
 * @returns {Gen}
 * @example L(4, seq(10, 20)) // [10, 10, 20, 20]
 */
export const seq = (...lg) => {
  lg = lg.map(lift);
  const nn = lg.length;
  return (c) => {
    const dt = (c.etime - c.stime) / nn;
    const k = Math.floor((c.ctime - c.stime) / dt);
    const p = c.reverse ? nn - 1 - k : k;
    const ct = c.stime + clMod(c.ctime - c.stime, dt);
    const g = lg[p];
    return g ? g(ctx(c.stime, ct, c.stime + dt, c.reverse)) : NIL;
  };
};

// ________________________________________________________ combinateurs non temporels

/**
 * `(s g)` : sérialise une liste, un élément par appel. Quand elle est épuisée, la liste est
 * réévaluée (si g est un générateur) ou reprise (si c'est une liste constante).
 * @param {GenLike} g Liste, ou générateur de listes.
 * @returns {Gen}
 * @example L(5, s([1, 2, 3])) // [1, 2, 3, 1, 2]
 */
export const s = (g) => {
  const isGen = typeof g === 'function';
  let l = [];
  return (c) => {
    if (l.length === 0) l = [...(isGen ? g(c) : g) ?? []];
    return l.length ? l.shift() : NIL;
  };
};

/**
 * `(borne gb1 gb2 gval)` : réfléchit une fois la valeur sur la borne dépassée.
 * @param {GenLike} gb1 Borne basse.
 * @param {GenLike} gb2 Borne haute.
 * @param {GenLike} gval Valeur.
 * @returns {Gen}
 */
export const borne = (gb1, gb2, gval) => {
  gb1 = lift(gb1); gb2 = lift(gb2); gval = lift(gval);
  return (c) => {
    const b1 = gb1(c), b2 = gb2(c), val = gval(c);
    return val < b1 ? b1 + b1 - val : val > b2 ? b2 + b2 - val : val;
  };
};

/**
 * `(ecrete gb1 gb2 gval)` : écrête la valeur aux bornes.
 * @param {GenLike} gb1 Borne basse.
 * @param {GenLike} gb2 Borne haute.
 * @param {GenLike} gval Valeur.
 * @returns {Gen}
 */
export const ecrete = (gb1, gb2, gval) => {
  gb1 = lift(gb1); gb2 = lift(gb2); gval = lift(gval);
  return (c) => {
    const b1 = gb1(c), b2 = gb2(c), val = gval(c);
    return val < b1 ? b1 : val > b2 ? b2 : val;
  };
};

/**
 * `(h g)` : tire uniformément un élément de la liste, avec remise.
 * @param {GenLike} g Liste, ou générateur de listes (réévalué à chaque appel).
 * @returns {Gen}
 * @example h([90, 80, 70])(c) // 80
 */
export const h = (g) => {
  if (typeof g === 'function') return (c) => { const l = g(c); return elt(l, random(l.length)); };
  const n = g.length;
  return () => elt(g, random(n));
};

/**
 * `(hs g)` : tire sans remise jusqu'à épuisement de la liste, puis la réévalue. Comme
 * `(remove vv l :count 1)`, retire la PREMIÈRE occurrence de la valeur tirée (les doublons
 * comptent comme des poids : c'est ce que fait la liste de g-parties).
 * @param {GenLike} g Liste, ou générateur de listes.
 * @returns {Gen}
 * @example L(3, hs([1, 2, 3])) // une permutation de [1, 2, 3]
 */
export const hs = (g) => {
  g = lift(g);
  let l = [], nn = 0;
  return (c) => {
    if (l.length === 0) { l = [...g(c)]; nn = l.length; }
    const vv = elt(l, random(nn));
    l.splice(l.indexOf(vv), 1);
    nn--;
    return vv;
  };
};

/**
 * Toutes les combinaisons (sous-ensembles) d'une liste, dans l'ordre du Lisp.
 * @param {Array<any>} l
 * @returns {Array<Array<any>>}
 * @example combinaisons([1, 2]) // [[1], [], [1, 2], [2]] (ordre de la fonction Lisp)
 */
export function combinaisons(l) {
  if (l.length === 0) return [[]];
  const p = combinaisons(l.slice(1));
  const rr = [];
  for (const e of p) { rr.unshift(e); rr.unshift([l[0], ...e]); }
  return rr;
}

/**
 * `(cb g)` : générateur des combinaisons de la liste rendue par g.
 * @param {GenLike} g
 * @returns {Gen}
 */
export const cb = (g) => { g = lift(g); return (c) => combinaisons(g(c)); };

/**
 * `(nonil g)` : réévalue g jusqu'à obtenir une valeur qui n'est pas NIL. Boucle sans fin si g
 * ne rend que NIL, comme en Lisp.
 * @param {GenLike} g
 * @returns {Gen}
 */
export const nonil = (g) => { g = lift(g); return (c) => { for (;;) { const v = g(c); if (!isNil(v)) return v; } }; };

/**
 * `(rnd g1 g2)` : nombre aléatoire entre les deux bornes incluses (entier si les bornes le
 * sont) : `min + (random (1+ (floor |v1 - v2|)))`. g1 est évalué avant g2.
 * @param {GenLike} g1 Première borne.
 * @param {GenLike} g2 Seconde borne (l'ordre des bornes est indifférent).
 * @returns {Gen}
 * @example rnd(21, 38)(c) // un entier de 21 à 38
 */
export const rnd = (g1, g2) => {
  g1 = lift(g1); g2 = lift(g2);
  return (c) => {
    const v1 = g1(c), v2 = g2(c);
    return Math.min(v1, v2) + random(1 + Math.floor(Math.abs(v1 - v2)));
  };
};

/**
 * `(sel g1 g...)` : évalue seulement le générateur d'indice `(round g1)` (arrondi au pair).
 * Erreur si l'indice sort de la liste.
 * @param {GenLike} g1 Générateur d'indice.
 * @param {...GenLike} lg Alternatives.
 * @returns {Gen}
 * @example sel(h([0, 0, 1]), 'a', 'b') // 'a' deux fois sur trois
 */
export const sel = (g1, ...lg) => { g1 = lift(g1); lg = lg.map(lift); return (c) => elt(lg, clRound(g1(c)))(c); };

/**
 * `(selr g1 g...)` : évalue TOUTES les alternatives (avant g1), puis rend le résultat d'indice
 * `(round g1)`. Contrairement à {@link sel}, chaque alternative consomme son état à chaque appel.
 * @param {GenLike} g1 Générateur d'indice.
 * @param {...GenLike} lg Alternatives.
 * @returns {Gen}
 */
export const selr = (g1, ...lg) => {
  g1 = lift(g1); lg = lg.map(lift);
  return (c) => { const vals = lg.map((g) => g(c)); return elt(vals, clRound(g1(c))); };
};

/**
 * `(alt g...)` : appelle les générateurs à tour de rôle, circulairement.
 * @param {...GenLike} lg
 * @returns {Gen}
 * @example L(5, alt(1, 3)) // [1, 3, 1, 3, 1]
 */
export const alt = (...lg) => {
  lg = lg.map(lift);
  let l = [];
  return (c) => { if (l.length === 0) l = [...lg]; return l.shift()(c); };
};

/**
 * `(ralt x y z...)` : `(alt x (ralt y z...))`, alternance imbriquée à droite.
 * @param {...GenLike} lg
 * @returns {Gen}
 */
export const ralt = (...lg) => (lg.length < 2 ? lift(lg[0]) : alt(lg[0], ralt(...lg.slice(1))));

/**
 * `(lalt x y z...)` : `(alt (lalt y z...) x)`, alternance imbriquée à gauche.
 * @param {...GenLike} lg
 * @returns {Gen}
 */
export const lalt = (...lg) => (lg.length < 2 ? lift(lg[0]) : alt(lalt(...lg.slice(1)), lg[0]));

/**
 * `(rdg g1 g2)` : réduit la liste par la gauche.
 * @param {GenLike} g1 Générateur qui rend une fonction à deux arguments.
 * @param {GenLike} g2 Générateur de listes.
 * @returns {Gen}
 * @example rdg(G(minus), [10, 2, 3, 4, 5])(c) // -4
 */
export const rdg = (g1, g2) => { g1 = lift(g1); g2 = lift(g2); return (c) => { const f = g1(c); return clReduce(f, g2(c)); }; };

/**
 * `(rdd g1 g2)` : réduit la liste par la droite.
 * @param {GenLike} g1 Générateur qui rend une fonction à deux arguments.
 * @param {GenLike} g2 Générateur de listes.
 * @returns {Gen}
 * @example rdd(G(minus), [10, 2, 3, 4, 5])(c) // 12
 */
export const rdd = (g1, g2) => { g1 = lift(g1); g2 = lift(g2); return (c) => { const f = g1(c); return clReduce(f, g2(c), true); }; };

/**
 * `(rdv g1 g2)` : réduction « verticale » : la première valeur est celle de g2, les suivantes
 * `f(précédente, g2)`. Avec `G(plus)`, c'est une somme cumulée (marche aléatoire).
 * @param {GenLike} g1 Générateur qui rend une fonction à deux arguments.
 * @param {GenLike} g2 Générateur de valeurs.
 * @returns {Gen}
 */
export const rdv = (g1, g2) => {
  g1 = lift(g1); g2 = lift(g2);
  let start = true, prev;
  return (c) => {
    if (start) { start = false; prev = g2(c); } else { const f = g1(c); prev = f(prev, g2(c)); }
    return prev;
  };
};

/**
 * `(dif g)` : réévalue g tant que la valeur est égale (`equal`) à la précédente.
 * @param {GenLike} g
 * @returns {Gen}
 */
export const dif = (g) => {
  g = lift(g);
  let prev = Symbol('gensym');
  return (c) => {
    let curr;
    do { curr = g(c); } while (clEqual(curr, prev));
    prev = curr;
    return curr;
  };
};

/**
 * `(pf g1 g2)` : rend une valeur de g1 au premier appel, puis celles de g2.
 * @param {GenLike} g1
 * @param {GenLike} g2
 * @returns {Gen}
 */
export const pf = (g1, g2) => { g1 = lift(g1); g2 = lift(g2); let start = true; return (c) => { if (start) { start = false; return g1(c); } return g2(c); }; };

/**
 * `(freeze g)` : rend toujours la première valeur de g.
 * @param {GenLike} g
 * @returns {Gen}
 */
export const freeze = (g) => { g = lift(g); let start = true, val; return (c) => { if (start) { start = false; val = g(c); } return val; }; };

/**
 * `(pl g1 g2)` : rend g2 au dernier appel (`ctime + 1 = etime`), g1 sinon.
 * @param {GenLike} g1
 * @param {GenLike} g2
 * @returns {Gen}
 */
export const pl = (g1, g2) => { g1 = lift(g1); g2 = lift(g2); return (c) => (c.ctime + 1 === c.etime ? g2(c) : g1(c)); };

/**
 * `(blk g1 g2)` : liste de `(floor g1)` valeurs de g2.
 * @param {GenLike} g1 Nombre de valeurs.
 * @param {GenLike} g2 Générateur des valeurs.
 * @returns {Gen}
 */
export const blk = (g1, g2) => {
  g1 = lift(g1); g2 = lift(g2);
  return (c) => { const n = Math.floor(g1(c)), out = []; for (let k = 0; k < n; k++) out.push(g2(c)); return out; };
};

/**
 * `(rep gval grep)` : tire une valeur de gval et la rend grep fois de suite (grep est tiré en
 * premier, au début de chaque répétition).
 * @param {GenLike} gval Valeur répétée.
 * @param {GenLike} grep Nombre de répétitions.
 * @returns {Gen}
 * @example L(5, rep(s([7, 8]), 2)) // [7, 7, 8, 8, 7]
 */
export const rep = (gval, grep) => {
  gval = lift(gval); grep = lift(grep);
  let vv = NIL, rr = 0;
  return (c) => {
    if (rr <= 0) { rr = grep(c); vv = gval(c); }
    rr--;
    return vv;
  };
};

/**
 * `(mem src size chg)` : mémoire en boucle. Rejoue la valeur produite `size` appels plus tôt ;
 * tous les `chg` appels, ou tant que la mémoire est trop courte, prend une nouvelle valeur de
 * src. Mémoire de 65 à 130 valeurs (deux listes de 64). Correction YO du 30-11-2001 incluse.
 * Ordre par appel : size, puis src, puis chg.
 * @param {GenLike} src Source des nouvelles valeurs.
 * @param {GenLike} size Longueur de la boucle.
 * @param {GenLike} chg Nombre d'appels entre deux nouvelles valeurs.
 * @returns {Gen}
 */
export const mem = (src, size, chg) => {
  src = lift(src); size = lift(size); chg = lift(chg);
  let n1 = 0, n2 = 0, l1 = [], l2 = [], decompte = 0; // l1, l2 : la valeur la plus récente en tête
  return (c) => {
    let y;
    const d = Math.floor(size(c)) - 1;
    decompte--;
    if (decompte <= 0 || d >= n1 + n2) {
      y = src(c);
      if (decompte <= 0) decompte = chg(c);
    } else {
      y = d < n1 ? l1[d] : l2[d - n1];
    }
    l1.unshift(y);
    n1++;
    if (n1 > 64) { n2 = n1; l2 = l1; n1 = 0; l1 = []; }
    return y;
  };
};

/**
 * `(add g...)` : somme des valeurs.
 * @param {...GenLike} lg
 * @returns {Gen}
 * @example add(16, h([0, 1, 4]))(c) // 16, 17 ou 20
 */
export const add = (...lg) => appl(G(plus), lst(...lg));

/**
 * `(sub g...)` : différence, comme `-` en Lisp (un seul argument : l'opposé).
 * @param {...GenLike} lg
 * @returns {Gen}
 */
export const sub = (...lg) => appl(G(minus), lst(...lg));

/**
 * `(mult g...)` : produit.
 * @param {...GenLike} lg
 * @returns {Gen}
 */
export const mult = (...lg) => appl(G(times), lst(...lg));

/**
 * `(div g...)` : quotient, comme `/` en Lisp (un seul argument : l'inverse). Division par zéro
 * en erreur. Résultat flottant (rationnel exact en Lisp).
 * @param {...GenLike} lg
 * @returns {Gen}
 */
export const div = (...lg) => appl(G(divide), lst(...lg));

/**
 * `(floo g)` : partie entière par défaut (`floor`).
 * @param {GenLike} val
 * @returns {Gen}
 */
export const floo = (val) => { val = lift(val); return (c) => Math.floor(val(c)); };

/**
 * `(frag val div)` : tire val et dv, puis rend `val / dv` pendant dv appels.
 * @param {GenLike} val Valeur à fragmenter.
 * @param {GenLike} dv Nombre de fragments.
 * @returns {Gen}
 */
export const frag = (val, dv) => {
  val = lift(val); dv = lift(dv);
  let cc = 0, vv = 0;
  return (c) => { if (cc < 1) { cc = dv(c); vv = val(c) / cc; } cc--; return vv; };
};

/**
 * `(shift g1 g2)` : décale les valeurs de g2 de g1 rangs (au plus 255). Au premier appel, g2
 * est évalué 256 fois pour remplir le tampon : cela compte pour les générateurs à état.
 * @param {GenLike} g1 Décalage.
 * @param {GenLike} g2 Générateur décalé.
 * @returns {Gen}
 * @example L(2, shift(2, s([1, 2, 3, 4]))) // [3, 4] (exemple du source Lisp)
 */
export const shift = (g1, g2) => {
  g1 = lift(g1); g2 = lift(g2);
  const tab = new Array(256);
  let head = 0, startp = true;
  return (c) => {
    if (startp) { for (let k = 0; k < 256; k++) tab[k] = g2(c); startp = false; }
    const res = tab[(head + g1(c)) & 255];
    tab[head] = g2(c);
    head = (head + 1) & 255;
    return res;
  };
};

/**
 * `(freq g1 g2)` : change la fréquence d'un générateur (g1 > 1 saute des valeurs, g1 < 1 les
 * répète).
 * @param {GenLike} g1 Facteur de fréquence.
 * @param {GenLike} g2 Générateur.
 * @returns {Gen}
 * @example L(2, freq(2, s([1, 2, 3, 4]))) // [2, 4] (exemple du source Lisp)
 * @example L(4, freq(0.5, s([1, 2, 3, 4]))) // [1, 1, 2, 2]
 */
export const freq = (g1, g2) => {
  g1 = lift(g1); g2 = lift(g2);
  let cc = 0, vv, startp = true;
  return (c) => {
    if (startp) { startp = false; vv = g2(c); }
    if (cc <= 1) cc += g1(c);
    while (cc > 1) { cc--; vv = g2(c); }
    return vv;
  };
};

/**
 * `(mini g...)` : minimum des valeurs.
 * @param {...GenLike} lg
 * @returns {Gen}
 */
export const mini = (...lg) => appl(G(Math.min), lst(...lg));

/**
 * `(maxi g...)` : maximum des valeurs.
 * @param {...GenLike} lg
 * @returns {Gen}
 */
export const maxi = (...lg) => appl(G(Math.max), lst(...lg));

/**
 * `(gor g...)` : « ou » logique : évalue tout, rend la première valeur non NIL, ou NIL.
 * @param {...GenLike} lg
 * @returns {Gen}
 */
export const gor = (...lg) => { lg = lg.map(lift); return (c) => { const v = lg.map((g) => g(c)).find((x) => !isNil(x)); return v === undefined ? NIL : v; }; };

/**
 * `(gand g...)` : « et » logique : T si aucune valeur n'est NIL, NIL sinon.
 * @param {...GenLike} lg
 * @returns {Gen}
 */
export const gand = (...lg) => { lg = lg.map(lift); return (c) => (lg.map((g) => g(c)).every((x) => !isNil(x)) ? T : NIL); };

/**
 * `(gnot g)` = `(appl °not g)` : g doit rendre une LISTE d'un élément (bizarrerie du Lisp
 * d'origine ; voir {@link ggnot} pour la négation simple).
 * @param {GenLike} g
 * @returns {Gen}
 */
export const gnot = (g) => appl(G((x) => (isNil(x) ? T : NIL)), g);

/**
 * `(ggnot g)` : négation logique de la valeur de g.
 * @param {GenLike} g
 * @returns {Gen}
 */
export const ggnot = (g) => { g = lift(g); return (c) => (isNil(g(c)) ? T : NIL); };

/**
 * `(gmod g1 g2)` : modulo, avec le signe du diviseur comme en Lisp.
 * @param {GenLike} g1 Dividende.
 * @param {GenLike} g2 Diviseur.
 * @returns {Gen}
 */
export const gmod = (g1, g2) => { g1 = lift(g1); g2 = lift(g2); return (c) => { const a = g1(c); return clMod(a, g2(c)); }; };

/**
 * `(gate g1 g2 &optional phase)` : T pendant g1 appels, NIL pendant g2 appels, en boucle.
 * @param {GenLike} g1 Durée de l'état T.
 * @param {GenLike} g2 Durée de l'état NIL.
 * @param {GenLike} [phase] Décalage (voir {@link shift}).
 * @returns {Gen}
 */
export const gate = (g1, g2, phase) =>
  (phase !== undefined ? shift(phase, gate(g1, g2)) : s(call(G((a, b) => [...a, ...b]), blk(g1, G(T)), blk(g2, G(NIL)))));

/**
 * `(gpgate gp gv1 &optional gv2)` : porte probabiliste : gv1 avec la probabilité gp, gv2 sinon.
 * Seule la branche choisie est évaluée.
 * @param {GenLike} gp Probabilité (0 à 1).
 * @param {GenLike} gv1 Valeur si la porte est ouverte.
 * @param {GenLike} [gv2=NIL] Valeur si elle est fermée.
 * @returns {Gen}
 */
export const gpgate = (gp, gv1, gv2 = G(NIL)) => {
  gp = lift(gp); gv1 = lift(gv1); gv2 = lift(gv2);
  return (c) => (gp(c) * 1000 > random(1000) ? gv1(c) : gv2(c));
};

/**
 * `(pulse g &optional phase)` : T une fois tous les g appels, NIL sinon.
 * @param {GenLike} g Période.
 * @param {GenLike} [phase] Décalage (voir {@link shift}).
 * @returns {Gen}
 * @example L(6, pulse(3)) // [true, null, null, true, null, null]
 */
export const pulse = (g, phase) =>
  (phase !== undefined ? shift(phase, pulse(g)) : s(call(G((a, b) => [a, ...b]), G(T), blk(call(G(minus), g, 1), G(NIL)))));

/**
 * `(gbrown init min max delta)` : marche aléatoire repliée dans [min, max] par {@link tore}.
 * @param {GenLike} init Point de départ (réévalué à chaque appel).
 * @param {GenLike} min
 * @param {GenLike} max
 * @param {GenLike} delta Pas, cumulé par {@link rdv}.
 * @returns {Gen}
 */
export const gbrown = (init, min, max, delta) => call(G(tore), call(G(plus), init, rdv(G(plus), delta)), min, max);

/**
 * `(gbrown2 init min max delta)` : comme {@link gbrown}, init n'étant pris qu'une fois.
 * @param {GenLike} init
 * @param {GenLike} min
 * @param {GenLike} max
 * @param {GenLike} delta
 * @returns {Gen}
 */
export const gbrown2 = (init, min, max, delta) => call(G(tore), rdv(G(plus), pf(init, delta)), min, max);

/**
 * `(greplie gx gmin gmax)` : replie les valeurs de gx dans [min, max] (voir {@link replie}).
 * Ordre : min, max, puis x.
 * @param {GenLike} gx
 * @param {GenLike} gmin
 * @param {GenLike} gmax
 * @returns {Gen}
 */
export const greplie = (gx, gmin, gmax) => {
  gx = lift(gx); gmin = lift(gmin); gmax = lift(gmax);
  return (c) => { const min = gmin(c), max = gmax(c), x = gx(c); return replie(x, min, max); };
};

/**
 * `(sinus period)` : sinus dont la phase avance de 2π/period à chaque appel (le premier appel
 * rend déjà sin(2π/period)).
 * @param {GenLike} period Nombre d'appels par période.
 * @returns {Gen}
 */
export const sinus = (period) => {
  period = lift(period);
  let x = 0;
  return (c) => Math.sin((x += (2 * Math.PI) / period(c)));
};

/**
 * `(osc period min max)` : oscillateur sinusoïdal entre min et max. Ordre : min, max, period.
 * @param {GenLike} period Nombre d'appels par période.
 * @param {GenLike} min
 * @param {GenLike} max
 * @returns {Gen}
 */
export const osc = (period, min, max) => {
  period = lift(period); min = lift(min); max = lift(max);
  let x = 0;
  return (c) => {
    const m = min(c), M = max(c);
    return m + (M - m) * ((1 + Math.sin((x += (2 * Math.PI) / period(c)))) / 2);
  };
};

/**
 * `(gosc init min max delta)` (PAJ) : oscille entre deux valeurs par cumul de delta, replié.
 * @param {GenLike} init
 * @param {GenLike} min
 * @param {GenLike} max
 * @param {GenLike} delta
 * @returns {Gen}
 */
export const gosc = (init, min, max, delta) => greplie(call(G(plus), init, rdv(G(plus), pf(0, delta))), min, max);

/**
 * `(gosc2 ginit gmin gmax gpas)` (PAJ) : va-et-vient entre min et max par pas de |pas|, en
 * s'arrêtant sur les bornes. Un changement de signe du pas inverse le sens.
 * @param {GenLike} ginit Valeur de départ (repliée dans les bornes).
 * @param {GenLike} gmin
 * @param {GenLike} gmax
 * @param {GenLike} gpas
 * @returns {Gen}
 */
export const gosc2 = (ginit, gmin, gmax, gpas) => {
  ginit = lift(ginit); gmin = lift(gmin); gmax = lift(gmax); gpas = lift(gpas);
  let start = true, prev, monte, ancienpas;
  const changesigne = (a, b) => a * b < 0;
  return (c) => {
    let min = gmin(c), max = gmax(c);
    const pas = gpas(c);
    if (max < min) [min, max] = [max, min];
    if (start) {
      start = false; prev = replie(ginit(c), min, max); ancienpas = pas; monte = pas >= 0;
    } else {
      if (changesigne(pas, ancienpas)) { ancienpas = pas; monte = pas >= 0; }
      const a = Math.abs(pas);
      if (min === max) prev = min;
      else if (monte) {
        if (prev + a > max) { monte = false; prev = prev === max ? Math.max(prev - a, min) : max; } else prev += a;
      } else if (prev - a < min) { monte = true; prev = prev === min ? Math.min(prev + a, max) : min; } else prev -= a;
    }
    return prev;
  };
};

/**
 * `(pblk gpat gval)` : blocs symboliques. Chaque symbole (une chaîne) du motif reçoit une
 * valeur de gval, la même partout dans une instanciation ; les blocs sont rendus un par un.
 * @param {GenLike} gpat Motif : liste de listes de symboles et de nombres.
 * @param {GenLike} gval Générateur des valeurs des symboles.
 * @returns {Gen}
 * @example L(2, pblk([['x', 'y'], ['y', 'x', 'y']], rdv(G(plus), 1))) // [[1, 2], [2, 1, 2]]
 */
export const pblk = (gpat, gval) => {
  gpat = lift(gpat); gval = lift(gval);
  let l = [];
  const instancie = (c) => {
    const env = new Map();
    const foo = (x) => {
      if (x === null) return x;
      if (typeof x === 'string') { if (!env.has(x)) env.set(x, gval(c)); return env.get(x); }
      if (Array.isArray(x)) return x.map(foo);
      return x;
    };
    return gpat(c).map(foo);
  };
  return (c) => { if (l.length === 0) l = instancie(c); return l.length ? l.shift() : NIL; };
};

/**
 * `(perm gl)` : interpolation par permutation. Passe d'une liste à la suivante en remplaçant
 * un élément à la fois, dans un ordre aléatoire.
 * @param {GenLike} gl Générateur de listes de même longueur.
 * @returns {Gen}
 */
export const perm = (gl) => {
  gl = lift(gl);
  const permlist = (nn) => {
    const l = [];
    for (let k = nn; k > 0; k--) {
      let x = random(nn);
      while (l.includes(x)) x = random(nn);
      l.unshift(x);
    }
    return l;
  };
  const exch = (l1, l2, nn) => (nn === 0 ? [l2[0], ...l1.slice(1)] : [l1[0], ...exch(l1.slice(1), l2.slice(1), nn - 1)]);
  let cc = null, sv = null, p = [], startp = true;
  return (c) => {
    if (startp) { sv = gl(c); startp = false; }
    if (p.length === 0) { cc = sv; sv = gl(c); p = permlist(cc.length); }
    cc = exch(cc, sv, p.shift());
    return cc;
  };
};

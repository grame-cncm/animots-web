/**
 * @file Transpileur des séquences de Gerland2013-4.lsp vers JavaScript.
 *
 * Il ne traduit que le sous-ensemble du Lisp présent dans les fonctions `sequence-N` et dans
 * les essais (`test`, `test1`, `test1bis`, `test2`, `test3`, `test4`). Toute forme, tout
 * symbole ou tout littéral qu'il ne connaît pas provoque une erreur qui cite la ligne du
 * source : rien n'est deviné ni ignoré en silence.
 *
 * ## Correspondances
 *
 * | Lisp | JavaScript |
 * |------|------------|
 * | `(defun sequence-N (deb fin) ...)` | `export function sequenceN(score, deb, fin) { ... }` |
 * | `(print-dialog "X")`, `(place-prog 0 m2 *out*)`, `(place-tempo 0 60)` | `printDialog(score, 'X')`, `placeProg(score, 0, MULTIS.m2)`, `placeTempo(score, 0, 60)` |
 * | `(prorythme ...)`, `(n-prorythme ...)` | `prorythme(score, ...)`, `nProrythme(score, ...)` |
 * | `(let ((x e) ...) corps)`, `let*` | `const x = e;` puis le corps |
 * | `(g (car (l 1 deb)))` | `once(deb)` |
 * | `(car e)`, `(l n g)`, `(g e)` | `e[0]`, `L(n, g)`, `G(e)` |
 * | `(share-gen n1 g)`, `(use-gen n1)`, `(free-gen n1)` | `shareGen('n1', g)`, `useGen('n1')`, `freeGen('n1')` |
 * | `(gnotes :proba p)`, `(n-gnotes c r h v :laccord a)` | `gnotes({ proba: p })`, `nGnotes(c, r, h, v, { laccord: a })` |
 * | `°16`, `°(1/2 1)`, `°((1) (2))` | `16`, `[1 / 2, 1]`, `[[1], [2]]` |
 * | `°(2/3c (1/2 1/2 1/2))` | `[t('2/3c', [1 / 2, 1 / 2, 1 / 2])]` |
 * | `*zone1*`, `*gaccord-demi*`... | `ZONE1`, `GACCORD_DEMI`... (piece/gerland/config.js) |
 * | `` `(forme) `` (quasi-citation : pas exécutée) | un commentaire qui le signale |
 * | `; commentaire` | `// commentaire` |
 *
 * Les autres fonctions (`h`, `rnd`, `rep`, `sel-al`...) gardent leur nom, converti en
 * camelCase (`sel-al` devient `selAl`), d'après la table {@link FUNCTIONS}.
 */

import { read, print, isNumber } from './reader.js';
import { TUPLETS } from '../core/rhythm.js';

/**
 * Fonctions appelables dans les séquences : nom Lisp -> [nom JavaScript, module].
 * Modules : 'core' (core/index.js), 'tools' (piece/gerland/tools.js), 'config' (piece/gerland/config.js).
 */
export const FUNCTIONS = Object.freeze({
  h: ['h', 'core'], hs: ['hs', 'core'], s: ['s', 'core'], rnd: ['rnd', 'core'], rep: ['rep', 'core'],
  alt: ['alt', 'core'], sel: ['sel', 'core'], i: ['i', 'core'], seq: ['seq', 'core'], lst: ['lst', 'core'],
  add: ['add', 'core'], sub: ['sub', 'core'], mult: ['mult', 'core'], div: ['div', 'core'], floo: ['floo', 'core'],
  mem: ['mem', 'core'], dif: ['dif', 'core'], shift: ['shift', 'core'], greplie: ['greplie', 'core'],
  concat: ['concat', 'core'], nconcat: ['nconcat', 'core'],
  'sel-al': ['selAl', 'tools'], xconcat: ['xconcat', 'tools'], traj: ['traj', 'tools'], groupe: ['groupe', 'tools'],
  'nconcat-spe4': ['nconcatSpe4', 'tools'], 'list-nvaleur': ['listNvaleur', 'tools'], glist: ['glist', 'tools'],
  glistedate: ['glistedate', 'tools'], glistedur: ['glistedur', 'tools'], 'date-dur': ['dateDur', 'tools'],
  'transf-dat': ['transfDat', 'tools'],
});

/** Fonctions sans argument qui créent un générateur (config.js). */
const FACTORIES = Object.freeze({ trajectoires: 'trajectoires', listgroupe: 'listgroupe' });

/** Variables globales du Lisp -> constantes de config.js. */
export const GLOBALS = Object.freeze({
  '*gaccord*': 'GACCORD', '*gaccord-demi*': 'GACCORD_DEMI', '*gecar*': 'GECAR',
  '*zone1*': 'ZONE1', '*zone2*': 'ZONE2', '*zone3*': 'ZONE3',
  '*traj-total-direct*': 'TRAJ_TOTAL_DIRECT', '*traj-total-indirect*': 'TRAJ_TOTAL_INDIRECT',
  '*traj-total-direct2*': 'TRAJ_TOTAL_DIRECT2', '*traj-total-indirect2*': 'TRAJ_TOTAL_INDIRECT2',
  '*traj-zig-zag*': 'TRAJ_ZIG_ZAG', '*traj-zig-zag2*': 'TRAJ_ZIG_ZAG2',
});

/** Essais de la fenêtre de commande : nom Lisp -> nom JavaScript (libellé du bouton). */
export const ESSAIS = Object.freeze({
  test: 'essai', test1: 'cercle1', test1bis: 'essai1bis', test2: 'cercle2', test3: 'tutti', test4: 'alterne',
});

/** Formes qui sont des instructions (effet sur la partition ou sur les flux partagés). */
const STATEMENTS = new Set(['prorythme', 'n-prorythme', 'share-gen', 'free-gen', 'let', 'let*', 'print-dialog', 'place-prog', 'place-tempo']);

/**
 * Vrai si le nœud est une instruction (voir {@link STATEMENTS}).
 * @param {import('./reader.js').Node} n
 * @returns {boolean}
 */
const isStatement = (n) => n.kind === 'list' && STATEMENTS.has(n.items.find((x) => x.kind !== 'comment')?.name);

/** Paramètres de gnotes et n-gnotes acceptés. */
const KEYWORDS = new Set(['laccord', 'lecar', 'proba', 'stac']);

/** Largeur visée des lignes générées. */
const WIDTH = 110;

/**
 * Erreur de transpilation, située dans le source.
 * @param {import('./reader.js').Node} n Nœud fautif.
 * @param {string} msg
 * @returns {Error}
 */
const fail = (n, msg) => new Error(`Gerland2013-4.lsp, ligne ${n.line} : ${msg} : ${print(n)}`);

/**
 * Littéral numérique Lisp -> JavaScript (`1/2` -> `1 / 2`).
 * @param {string} s
 * @returns {string}
 */
function num(s) {
  if (s.includes('/')) { const [a, b] = s.split('/'); return `${Number(a)} / ${Number(b)}`; }
  return String(Number(s));
}

/**
 * Expression traduite : texte sur une ligne, et structure d'appel pour la mise en page.
 * @typedef {object} Expr
 * @property {string} flat Texte sur une ligne.
 * @property {string} [fn] Nom de la fonction appelée.
 * @property {Array<Expr>} [args] Arguments de l'appel.
 */

/**
 * Crée l'expression d'un appel de fonction.
 * @param {string} fn
 * @param {Array<Expr>} args
 * @returns {Expr}
 */
const callExpr = (fn, args) => ({ flat: `${fn}(${args.map((a) => a.flat).join(', ')})`, fn, args });

/**
 * Met en page une expression à partir d'une indentation : sur une ligne si elle tient, sinon un
 * argument par ligne.
 * @param {Expr} e
 * @param {number} indent Indentation de la ligne courante (espaces).
 * @param {number} [used=0] Caractères déjà écrits sur la ligne avant l'expression.
 * @returns {string}
 */
export function layout(e, indent, used = 0) {
  if (!e.fn || indent + used + e.flat.length <= WIDTH) return e.flat;
  const pad = ' '.repeat(indent + 2);
  return `${e.fn}(\n${e.args.map((a) => pad + layout(a, indent + 2)).join(',\n')})`;
}

/**
 * Traducteur d'une fonction Lisp (séquence ou essai) : garde les variables locales, les
 * commentaires en attente et les noms à importer.
 */
class FunctionTranslator {
  /**
   * @param {Set<string>} params Paramètres de la fonction (`deb`, `fin`).
   */
  constructor(params) {
    /** @type {Set<string>} Variables locales connues. */
    this.locals = new Set(params);
    /** @type {{core: Set<string>, tools: Set<string>, config: Set<string>}} Noms à importer. */
    this.imports = { core: new Set(), tools: new Set(), config: new Set() };
    /** @type {Array<string>} Commentaires rencontrés dans l'expression en cours. */
    this.pending = [];
  }

  /**
   * Note un nom à importer et le rend.
   * @param {string} name
   * @param {'core'|'tools'|'config'} mod
   * @returns {string}
   */
  use(name, mod) { this.imports[mod].add(name); return name; }

  /**
   * Retire les commentaires d'une liste de nœuds et les met en attente.
   * @param {Array<import('./reader.js').Node>} items
   * @returns {Array<import('./reader.js').Node>}
   */
  strip(items) {
    return items.filter((x) => {
      if (x.kind !== 'comment') return true;
      this.pending.push(cleanComment(x.value));
      return false;
    });
  }

  /**
   * Traduit un symbole (variable locale ou globale).
   * @param {import('./reader.js').Node} n
   * @returns {Expr}
   */
  symbol(n) {
    if (this.locals.has(n.name)) return { flat: n.name };
    if (GLOBALS[n.name]) return { flat: this.use(GLOBALS[n.name], 'config') };
    if (n.name === 'nil') return { flat: 'null' };
    if (n.name === 't') return { flat: 'true' };
    throw fail(n, 'symbole inconnu');
  }

  /**
   * Traduit une liste citée (`°(...)`) : nombres, sous-listes et n-olets.
   * @param {import('./reader.js').Node} n
   * @returns {Expr}
   */
  quoted(n) {
    if (n.kind === 'atom' && isNumber(n)) return { flat: num(n.name) };
    if (n.kind !== 'list') throw fail(n, 'littéral cité inattendu');
    const items = this.strip(n.items), out = [];
    for (let k = 0; k < items.length; k++) {
      const x = items[k];
      if (x.kind === 'atom' && /^\d+\/\d+[a-z]+$/.test(x.name)) {
        if (!TUPLETS[x.name]) throw fail(x, 'n-olet inconnu de TRADUIT-DUR-SYMB');
        const body = items[k + 1];
        if (!body || body.kind !== 'list') throw fail(x, 'un n-olet doit être suivi d’une liste');
        out.push(`${this.use('t', 'core')}('${x.name}', ${this.quoted(body).flat})`);
        k++;
      } else if (x.kind === 'atom' && x.name === '+') out.push("'+'");
      else out.push(this.quoted(x).flat);
    }
    return { flat: `[${out.join(', ')}]` };
  }

  /**
   * Traduit une expression.
   * @param {import('./reader.js').Node} n
   * @returns {Expr}
   */
  expr(n) {
    if (n.kind === 'atom') return isNumber(n) ? { flat: num(n.name) } : this.symbol(n);
    if (n.kind === 'string') return { flat: `'${n.value.replace(/'/g, "\\'")}'` };
    if (n.kind === 'prefix') {
      if (n.prefix !== '°') throw fail(n, `préfixe ${n.prefix} inattendu dans une expression`);
      const x = n.expr;
      if (x.kind === 'atom' && !isNumber(x)) return this.symbol(x); // °ldur1 : générateur constant de la variable
      return this.quoted(x);
    }
    if (n.kind !== 'list') throw fail(n, 'expression inattendue');
    const [head, ...rest] = this.strip(n.items);
    if (!head || head.kind !== 'atom') throw fail(n, 'appel sans nom de fonction');
    const h = head.name;
    if (h === 'g') {
      // (g (car (l 1 x))) : fige une valeur, écrit once(x)
      const a = rest[0];
      if (rest.length === 1 && a.kind === 'list') {
        const [c, inner] = a.items.filter((x) => x.kind !== 'comment');
        if (c?.name === 'car' && inner?.kind === 'list') {
          const [l, one, x] = inner.items.filter((y) => y.kind !== 'comment');
          if (l?.name === 'l' && one?.name === '1' && x) return callExpr(this.use('once', 'tools'), [this.expr(x)]);
        }
      }
      return callExpr(this.use('G', 'core'), rest.map((x) => this.expr(x)));
    }
    if (h === 'car') { this.arity(n, rest, 1); return { flat: `${this.expr(rest[0]).flat}[0]` }; }
    if (h === 'l') { this.arity(n, rest, 2); return callExpr(this.use('L', 'core'), rest.map((x) => this.expr(x))); }
    if (h === 'use-gen') { this.arity(n, rest, 1); return callExpr(this.use('useGen', 'core'), [{ flat: `'${rest[0].name}'` }]); }
    if (h === 'gnotes') return callExpr(this.use('gnotes', 'core'), this.keywords(n, rest));
    if (h === 'n-gnotes') {
      const k = rest.findIndex((x) => x.kind === 'atom' && x.name.startsWith(':'));
      const pos = k < 0 ? rest : rest.slice(0, k);
      if (pos.length !== 4) throw fail(n, 'n-gnotes attend 4 arguments avant les mots-clés');
      return callExpr(this.use('nGnotes', 'core'), [...pos.map((x) => this.expr(x)), ...this.keywords(n, k < 0 ? [] : rest.slice(k))]);
    }
    if (FACTORIES[h]) { this.arity(n, rest, 0); return callExpr(this.use(FACTORIES[h], 'config'), []); }
    if (FUNCTIONS[h]) {
      const [js, mod] = FUNCTIONS[h];
      return callExpr(this.use(js, mod), rest.map((x) => this.expr(x)));
    }
    throw fail(n, `forme inconnue (${h})`);
  }

  /**
   * Vérifie le nombre d'arguments.
   * @param {import('./reader.js').Node} n
   * @param {Array<import('./reader.js').Node>} args
   * @param {number} k
   * @returns {void}
   */
  arity(n, args, k) { if (args.length !== k) throw fail(n, `${k} argument(s) attendu(s)`); }

  /**
   * Traduit des paramètres à mots-clés (`:proba p :laccord a`) en objet.
   * @param {import('./reader.js').Node} n
   * @param {Array<import('./reader.js').Node>} items
   * @returns {Array<Expr>} Un seul argument objet, ou aucun.
   */
  keywords(n, items) {
    if (items.length === 0) return [];
    if (items.length % 2) throw fail(n, 'mots-clés incomplets');
    const parts = [];
    for (let k = 0; k < items.length; k += 2) {
      const key = items[k].name?.slice(1);
      if (!items[k].name?.startsWith(':') || !KEYWORDS.has(key)) throw fail(items[k], 'mot-clé non porté');
      parts.push(`${key}: ${this.expr(items[k + 1]).flat}`);
    }
    return [{ flat: `{ ${parts.join(', ')} }` }];
  }

  /**
   * Traduit une instruction du corps de la fonction.
   * @param {import('./reader.js').Node} n
   * @param {number} indent
   * @returns {Array<string>} Lignes produites.
   */
  statement(n, indent) {
    const pad = ' '.repeat(indent);
    if (n.kind === 'comment') return [`${pad}// ${cleanComment(n.value)}`.trimEnd()];
    if (n.kind === 'prefix' && n.prefix === '`') {
      return [`${pad}// Désactivé dans le Lisp par un accent grave (ligne ${n.line}), donc jamais exécuté :`, `${pad}//   ${print(n.expr)}`];
    }
    if (n.kind !== 'list') throw fail(n, 'instruction inattendue');
    const out = [];
    const flush = () => { for (const c of this.pending.splice(0)) out.push(`${pad}// ${c}`.trimEnd()); };
    const firstName = n.items.find((x) => x.kind !== 'comment')?.name;
    if (firstName === 'let' || firstName === 'let*') {
      // Le corps garde ses commentaires à leur place : on ne filtre que la tête et les liaisons.
      const iHead = n.items.findIndex((x) => x.kind !== 'comment');
      const iBind = n.items.findIndex((x, k) => k > iHead && x.kind !== 'comment');
      this.strip(n.items.slice(0, iBind));
      const bindings = n.items[iBind], body = n.items.slice(iBind + 1);
      for (const b of this.strip(bindings.items)) {
        const [name, value] = this.strip(b.items);
        if (this.locals.has(name.name)) throw fail(b, `variable ${name.name} déjà définie`);
        const e = this.expr(value);
        this.locals.add(name.name);
        flush();
        out.push(`${pad}const ${name.name} = ${layout(e, indent, name.name.length + 9)};`);
      }
      flush();
      for (const s of body) out.push(...this.statement(s, indent));
      return out;
    }
    const [head, ...rest] = this.strip(n.items);
    const h = head?.name;
    if (FUNCTIONS[h] && rest.some(isStatement)) {
      // Une fonction évalue tous ses arguments avant d'être appelée : les instructions passées en
      // arguments s'exécutent donc toutes, dans l'ordre, et le résultat de la fonction est perdu.
      flush();
      out.push(
        `${pad}// Dans le Lisp, les instructions qui suivent sont les arguments d'un appel (${h} ...) (ligne ${n.line}).`,
        `${pad}// Une fonction évalue tous ses arguments : elles s'exécutent donc TOUTES, dans l'ordre, et le`,
        `${pad}// générateur construit par ${h} n'est jamais utilisé. Comportement de 2013, conservé.`,
      );
      for (const a of rest) {
        if (isStatement(a)) out.push(...this.statement(a, indent));
        else out.push(`${pad}// argument sans effet, non traduit : ${print(a)}`);
      }
      return out;
    }
    let line;
    if (h === 'print-dialog') line = `${this.use('printDialog', 'tools')}(score, ${this.expr(rest[0]).flat});`;
    else if (h === 'place-prog') {
      if (rest[1]?.kind !== 'atom' || !/^m\d$/.test(rest[1].name)) throw fail(n, 'multi attendu');
      line = `${this.use('placeProg', 'tools')}(score, ${this.expr(rest[0]).flat}, ${this.use('MULTIS', 'config')}.${rest[1].name});`;
    } else if (h === 'place-tempo') line = `${this.use('placeTempo', 'core')}(score, ${rest.map((x) => this.expr(x).flat).join(', ')});`;
    else if (h === 'share-gen') line = `${this.use('shareGen', 'core')}('${rest[0].name}', ${layout(this.expr(rest[1]), indent, 20)});`;
    else if (h === 'free-gen') line = `${this.use('freeGen', 'core')}('${rest[0].name}');`;
    else if (h === 'prorythme' || h === 'n-prorythme') {
      const fn = this.use(h === 'prorythme' ? 'prorythme' : 'nProrythme', 'core');
      const want = h === 'prorythme' ? 8 : 4, inline = h === 'prorythme' ? 3 : 3;
      if (rest.length !== want) throw fail(n, `${h} attend ${want} arguments`);
      const args = rest.map((x) => this.expr(x));
      const first = `${fn}(score, ${args.slice(0, inline).map((a) => a.flat).join(', ')},`;
      const others = args.slice(inline).map((a) => `${pad}  ${layout(a, indent + 2)}`);
      flush();
      return [...out, `${pad}${first}`, `${others.join(',\n')});`];
    } else throw fail(n, `instruction inconnue (${h})`);
    flush();
    out.push(pad + line);
    return out;
  }
}

/**
 * Nettoie le texte d'un commentaire Lisp : retire les `;` de tête et les rangées d'étoiles
 * décoratives.
 * @param {string} s
 * @returns {string}
 */
export function cleanComment(s) {
  return s.replace(/^;+\s?/, '').replace(/^\s*\*{3,}\s*/, '').replace(/\s+$/, '');
}

/**
 * Fonction Lisp traduite.
 * @typedef {object} Translated
 * @property {string} lisp Nom Lisp (`sequence-10`, `test4`).
 * @property {string} js Nom JavaScript (`sequence10`, `alterne`).
 * @property {number} [num] Numéro de séquence.
 * @property {number} line Première ligne dans le source.
 * @property {number} endLine Dernière ligne.
 * @property {Array<string>} header Commentaires qui précèdent la fonction dans le source.
 * @property {Array<string>} body Lignes du corps JavaScript.
 * @property {{core: Set<string>, tools: Set<string>, config: Set<string>}} imports
 * @property {Array<string>} params Paramètres JavaScript après `score`.
 */

/**
 * Traduit toutes les séquences et tous les essais d'un source Lisp.
 * @param {string} text Source Lisp (fins de ligne `\n`).
 * @returns {{sequences: Array<Translated>, essais: Array<Translated>}}
 * @throws {Error} Au premier élément non traduisible, avec sa ligne.
 */
export function translate(text) {
  const forms = read(text);
  const sequences = [], essais = [];
  let header = [];
  for (const f of forms) {
    if (f.kind === 'comment') { header.push(cleanComment(f.value)); continue; }
    const items = f.kind === 'list' ? f.items.filter((x) => x.kind !== 'comment') : [];
    const name = items[0]?.name === 'defun' ? items[1]?.name : null;
    const m = name && /^sequence-(\d+)$/.exec(name);
    if (m || (name && ESSAIS[name])) {
      const params = items[2].items.map((p) => p.name);
      const tr = new FunctionTranslator(new Set(params));
      const bodyNodes = f.items.slice(f.items.indexOf(items[2]) + 1);
      const body = [];
      for (const s of bodyNodes) body.push(...tr.statement(s, 2));
      const entry = {
        lisp: name, js: m ? `sequence${m[1]}` : ESSAIS[name], num: m ? Number(m[1]) : undefined,
        line: f.line, endLine: f.endLine, header: header.filter((h) => h !== ''), body, imports: tr.imports, params,
      };
      (m ? sequences : essais).push(entry);
    }
    header = [];
  }
  return { sequences, essais };
}

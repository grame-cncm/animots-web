/**
 * @file Lecteur Lisp minimal, pour le sous-ensemble de Common Lisp écrit dans Gerland2013-4.lsp.
 *
 * Il transforme le texte en arbre de nœuds en gardant ce qu'un lecteur Lisp jetterait et dont
 * le transpileur a besoin :
 * - les commentaires `;`, comme nœuds, à leur place, pour les reporter dans le JavaScript ;
 * - le numéro de ligne de chaque nœud, pour situer le code généré et les erreurs.
 *
 * Préfixes reconnus : `°` (macro-caractère de CLCE : générateur constant), `` ` ``
 * (quasi-citation), `'` (citation) et `#'` (fonction). Les commentaires de bloc `#| ... |#`
 * sont ignorés. Les symboles sont mis en minuscules, car le lecteur Lisp ignore la casse
 * (`free-Gen` et `free-gen` sont le même symbole).
 */

/**
 * Nœud de l'arbre lu.
 * @typedef {object} Node
 * @property {'list'|'atom'|'string'|'prefix'|'comment'} kind
 * @property {number} line Ligne de début dans le source (à partir de 1).
 * @property {Array<Node>} [items] Éléments d'une liste (commentaires compris).
 * @property {string} [name] Texte d'un atome (symbole en minuscules, ou nombre tel qu'écrit).
 * @property {string} [value] Contenu d'une chaîne, ou texte d'un commentaire.
 * @property {string} [prefix] `°`, `` ` ``, `'` ou `#'`.
 * @property {Node} [expr] Expression qui suit un préfixe.
 * @property {number} [endLine] Ligne de fin (listes).
 */

/** Caractères qui terminent un atome. */
const DELIMITERS = new Set([' ', '\t', '\n', '(', ')', ';', '"', '°', '`', "'"]);

/**
 * Lit tout un texte Lisp.
 * @param {string} text Source, fins de ligne déjà normalisées en `\n`.
 * @returns {Array<Node>} Formes de premier niveau et commentaires de premier niveau.
 * @throws {Error} Si une parenthèse ou une chaîne n'est pas fermée.
 */
export function read(text) {
  let pos = 0, line = 1;
  const peek = () => text[pos];
  const next = () => { const ch = text[pos++]; if (ch === '\n') line++; return ch; };

  /**
   * Saute les blancs et les commentaires de bloc.
   * @returns {void}
   */
  function skip() {
    for (;;) {
      const ch = peek();
      if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') { next(); continue; }
      if (ch === '#' && text[pos + 1] === '|') {
        const end = text.indexOf('|#', pos + 2);
        if (end < 0) throw new Error(`ligne ${line} : commentaire #| non fermé`);
        while (pos < end + 2) next();
        continue;
      }
      return;
    }
  }

  /**
   * Lit un nœud à la position courante.
   * @returns {Node | null} null en fin de liste ou de texte.
   */
  function node() {
    skip();
    if (pos >= text.length) return null;
    const ch = peek(), start = line;
    if (ch === ')') return null;
    if (ch === ';') {
      let s = '';
      while (pos < text.length && peek() !== '\n') s += next();
      return { kind: 'comment', value: s, line: start };
    }
    if (ch === '(') {
      next();
      const items = [];
      for (;;) {
        const n = node();
        if (n === null) {
          if (peek() !== ')') throw new Error(`ligne ${start} : parenthèse non fermée`);
          next();
          return { kind: 'list', items, line: start, endLine: line };
        }
        items.push(n);
      }
    }
    if (ch === '"') {
      next();
      let s = '';
      while (pos < text.length && peek() !== '"') s += next();
      if (pos >= text.length) throw new Error(`ligne ${start} : chaîne non fermée`);
      next();
      return { kind: 'string', value: s, line: start };
    }
    if (ch === '°' || ch === '`' || ch === "'" || (ch === '#' && text[pos + 1] === "'")) {
      const prefix = ch === '#' ? "#'" : ch;
      next(); if (prefix === "#'") next();
      const expr = node();
      if (!expr) throw new Error(`ligne ${start} : rien après ${prefix}`);
      return { kind: 'prefix', prefix, expr, line: start };
    }
    let s = '';
    while (pos < text.length && !DELIMITERS.has(peek()) && peek() !== '\r') s += next();
    const isNumber = /^[+-]?(\d+(\/\d+)?|\d*\.\d+|\d+\.)$/.test(s);
    return { kind: 'atom', name: isNumber ? s : s.toLowerCase(), line: start };
  }

  const forms = [];
  for (;;) {
    const n = node();
    if (n === null) {
      if (pos < text.length) throw new Error(`ligne ${line} : parenthèse fermante en trop`);
      return forms;
    }
    forms.push(n);
  }
}

/**
 * Vrai si l'atome est un nombre (entier, rationnel ou décimal).
 * @param {Node} n
 * @returns {boolean}
 */
export const isNumber = (n) => n.kind === 'atom' && /^[+-]?(\d+(\/\d+)?|\d*\.\d+|\d+\.)$/.test(n.name);

/**
 * Réécrit un nœud en texte Lisp, sur une ligne (pour les messages et les commentaires générés).
 * @param {Node} n
 * @returns {string}
 */
export function print(n) {
  switch (n.kind) {
    case 'atom': return n.name;
    case 'string': return `"${n.value}"`;
    case 'prefix': return n.prefix + print(n.expr);
    case 'comment': return '';
    default: return `(${n.items.filter((x) => x.kind !== 'comment').map(print).join(' ')})`;
  }
}

/**
 * Lit un fichier Lisp de l'époque : octets en ISO-8859-1, fins de ligne CR (Mac classique) ou CRLF.
 * @param {Uint8Array} bytes Contenu brut du fichier.
 * @returns {string} Texte avec des fins de ligne `\n`.
 */
export function decodeLegacy(bytes) {
  return new TextDecoder('latin1').decode(bytes).replace(/\r\n?/g, '\n');
}

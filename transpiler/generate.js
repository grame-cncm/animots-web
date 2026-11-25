/**
 * @file Production des fichiers JavaScript à partir des fonctions traduites par `emit.js`.
 *
 * Produit, sous `piece/gerland/sequences/` :
 * - `sNN.js` : une séquence par fichier (`s01.js` à `s36.js`), avec son commentaire d'origine ;
 * - `essais.js` : les six essais de la fenêtre de commande ;
 * - `index.js` : les tables `SEQUENCES` (par numéro) et `ESSAIS` (par nom).
 *
 * Tous ces fichiers portent la mention « généré » : on ne les modifie pas à la main, on corrige
 * le transpileur puis on régénère (`npm run transpile`). `tests/transpile.test.js` échoue si un
 * fichier généré n'est plus à jour.
 */

import { translate } from './emit.js';

/** Chemin des fichiers générés, relatif à la racine du projet. */
export const OUT_DIR = 'piece/gerland/sequences';

/**
 * Rend un texte sûr dans un commentaire de bloc.
 * @param {string} s
 * @returns {string}
 */
const safe = (s) => s.replace(/\*\//g, '* /');

/**
 * Lignes d'import d'un fichier généré.
 * @param {{core: Set<string>, tools: Set<string>, config: Set<string>}} imports
 * @returns {string}
 */
function importLines(imports) {
  const lines = [];
  const add = (set, from) => {
    if (set.size) lines.push(`import { ${[...set].sort((a, b) => a.localeCompare(b)).join(', ')} } from '${from}';`);
  };
  add(imports.core, '../../../core/index.js');
  add(imports.tools, '../tools.js');
  add(imports.config, '../config.js');
  return lines.join('\n');
}

/**
 * Fusionne les imports de plusieurs fonctions traduites.
 * @param {Array<import('./emit.js').Translated>} list
 * @returns {{core: Set<string>, tools: Set<string>, config: Set<string>}}
 */
function mergeImports(list) {
  const m = { core: new Set(), tools: new Set(), config: new Set() };
  for (const t of list) for (const k of Object.keys(m)) for (const n of t.imports[k]) m[k].add(n);
  return m;
}

/**
 * Bloc JSDoc et code d'une fonction traduite.
 * @param {import('./emit.js').Translated} t
 * @param {string} summary Phrase de description.
 * @returns {string}
 */
function functionCode(t, summary) {
  const params = t.params.length ? `, ${t.params.join(', ')}` : '';
  const doc = [
    '/**',
    ` * ${summary}`,
    ` * Traduction de \`(${t.lisp}${t.params.length ? ` ${t.params.join(' ')}` : ''})\`, lignes ${t.line} à ${t.endLine}.`,
    ' * @param {import(\'../../../core/score.js\').Score} score Partition où écrire.',
    ...(t.params.includes('deb') ? [' * @param {import(\'../../../core/generators.js\').GenLike} deb Début (noires), tiré une fois.'] : []),
    ...(t.params.includes('fin') ? [' * @param {import(\'../../../core/generators.js\').GenLike} fin Fin (noires), tirée une fois.'] : []),
    ' * @returns {void}',
    ' */',
  ];
  return `${doc.join('\n')}\nexport function ${t.js}(score${params}) {\n${t.body.join('\n')}\n}\n`;
}

/** Mention commune des fichiers générés. */
const GENERATED = [
  ' * Généré par `npm run transpile` (transpiler/) depuis source/Gerland2013-4.lsp.',
  ' * Ne pas modifier à la main : corriger le transpileur, puis régénérer.',
  ' * tests/transpile.test.js vérifie que ce fichier est à jour.',
];

/**
 * Traduit un source Lisp et produit le contenu de tous les fichiers générés.
 * @param {string} text Source Lisp (fins de ligne `\n`).
 * @returns {Map<string, string>} Chemin relatif à la racine du projet -> contenu.
 */
export function generate(text) {
  const { sequences, essais } = translate(text);
  const files = new Map();

  for (const t of sequences) {
    const title = t.header.find((h) => /Séquence\s+\d+/.test(h)) ?? `Séquence ${t.num}`;
    const file = `s${String(t.num).padStart(2, '0')}.js`;
    const header = t.header.filter((h) => !/^\(/.test(h) && h.trim() !== '');
    const content = [
      '/**',
      ` * @file ${safe(title.replace(/^.*?(Séquence)/, '$1').trim())}.`,
      ' *',
      ...GENERATED,
      ' *',
      ' * Commentaire d\'origine :',
      ...header.map((h) => ` *     ${safe(h)}`),
      ' */',
      '',
      importLines(t.imports),
      '',
      functionCode(t, `Séquence ${t.num}.`),
    ].join('\n');
    files.set(`${OUT_DIR}/${file}`, content);
  }

  const essaiDoc = {
    essai: 'Essai « TEST » : un son sur les 8 premières enceintes à tour de rôle.',
    cercle1: 'Bouton « Cercle1 » : un son de percussion fait le tour des 16 enceintes.',
    essai1bis: 'Essai « TEST1BIS » : un son de percussion sur les 16 enceintes à la fois.',
    cercle2: 'Bouton « Cercle2 » : un son de tom fait le tour des 16 enceintes.',
    tutti: 'Bouton « Tutti » : un son de guiro sur les 16 enceintes à la fois.',
    alterne: 'Bouton « Alterne » : pour chaque couple d’enceintes voisines, alterne 5 fois une clave (comparaison des niveaux).',
  };
  files.set(`${OUT_DIR}/essais.js`, [
    '/**',
    ' * @file Essais de la fenêtre de commande (Cercle1, Cercle2, Tutti, Alterne) et deux essais',
    ' * de mise au point. Ce sont les outils de réglage des enceintes sur site.',
    ' *',
    ...GENERATED,
    ' */',
    '',
    importLines(mergeImports(essais)),
    '',
    essais.map((t) => functionCode(t, essaiDoc[t.js] ?? t.js)).join('\n'),
  ].join('\n'));

  const imports = sequences.map((t) => `import { ${t.js} } from './s${String(t.num).padStart(2, '0')}.js';`);
  files.set(`${OUT_DIR}/index.js`, [
    '/**',
    ' * @file Tables des séquences et des essais traduits.',
    ' *',
    ...GENERATED,
    ' */',
    '',
    ...imports,
    `import { ${essais.map((t) => t.js).join(', ')} } from './essais.js';`,
    '',
    '/** Séquences par numéro : `SEQUENCES[10](score, deb, fin)`. */',
    `export const SEQUENCES = Object.freeze({\n${sequences.map((t) => `  ${t.num}: ${t.js},`).join('\n')}\n});`,
    '',
    '/** Essais par nom : `ESSAIS.cercle1(score)`. */',
    `export const ESSAIS = Object.freeze({\n${essais.map((t) => `  ${t.js},`).join('\n')}\n});`,
    '',
  ].join('\n'));

  return files;
}

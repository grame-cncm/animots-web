#!/usr/bin/env node
/**
 * @file Régénère les séquences JavaScript depuis source/Gerland2013-4.lsp.
 *
 * Usage :
 *
 *     node scripts/transpile.js          écrit les fichiers de piece/gerland/sequences/
 *     node scripts/transpile.js --check  vérifie seulement qu'ils sont à jour (code de sortie 1 sinon)
 *
 * Les fichiers obsolètes du dossier (séquence disparue du source) sont signalés, pas effacés.
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodeLegacy } from '../transpiler/reader.js';
import { generate, OUT_DIR } from '../transpiler/generate.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const check = process.argv.includes('--check');
const files = generate(decodeLegacy(readFileSync(join(ROOT, 'source/Gerland2013-4.lsp'))));

let stale = 0;
for (const [rel, content] of files) {
  const path = join(ROOT, rel);
  const current = existsSync(path) ? readFileSync(path, 'utf8') : null;
  if (current === content) continue;
  stale++;
  if (check) console.log(`pas à jour : ${rel}`);
  else { mkdirSync(join(path, '..'), { recursive: true }); writeFileSync(path, content); console.log(`écrit : ${rel}`); }
}
for (const name of readdirSync(join(ROOT, OUT_DIR))) {
  if (!files.has(`${OUT_DIR}/${name}`)) console.log(`fichier en trop (non généré) : ${OUT_DIR}/${name}`);
}
console.log(`${files.size} fichiers, ${stale} ${check ? 'à régénérer' : 'réécrits'}`);
if (check && stale) process.exit(1);

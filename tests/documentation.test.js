/**
 * @file Vérifie que tout le code est documenté.
 *
 * Règle du projet : chaque fichier JavaScript commence par un bloc `@file`, et chaque symbole
 * exporté (`export const|function|class`) est précédé immédiatement d'un bloc de documentation
 * `/** ... *\/`. Les fonctions exportées qui prennent des paramètres les décrivent par `@param`.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

/**
 * Liste récursivement les fichiers .js d'un dossier.
 * @param {string} dir
 * @returns {Array<string>}
 */
function jsFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === 'node_modules' ? [] : jsFiles(p);
    return p.endsWith('.js') ? [p] : [];
  });
}

const FILES = ['core', 'piece', 'output', 'scripts', 'transpiler', 'tests'].flatMap((d) => jsFiles(join(ROOT, d)));

test('chaque fichier commence par un bloc @file (après un éventuel #!)', () => {
  for (const f of FILES) {
    const src = readFileSync(f, 'utf8').replace(/^#!.*\n/, '');
    assert.match(src, /^\/\*\*[\s\S]*?@file/, `${relative(ROOT, f)} : bloc @file manquant en tête`);
  }
});

test('chaque symbole exporté est précédé d’un bloc de documentation', () => {
  const missing = [];
  for (const f of FILES) {
    const lines = readFileSync(f, 'utf8').split('\n');
    lines.forEach((line, k) => {
      const m = line.match(/^export (?:const|function|class|let) (\w+)/);
      if (!m) return;
      // le bloc qui précède doit finir sur la ligne précédente, et ne pas être le bloc @file
      let ok = /\*\/\s*$/.test(lines[k - 1] ?? '');
      if (ok) {
        let j = k - 1;
        while (j > 0 && !lines[j].includes('/**')) j--;
        ok = !lines.slice(j, k).join('\n').includes('@file');
      }
      if (!ok) missing.push(`${relative(ROOT, f)}:${k + 1} ${m[1]}`);
    });
  }
  assert.deepEqual(missing, [], `symboles exportés sans documentation :\n${missing.join('\n')}`);
});

test('les fonctions exportées du noyau décrivent leurs paramètres', () => {
  const missing = [];
  for (const f of FILES.filter((p) => !p.includes(`${join(ROOT, 'tests')}`))) {
    const src = readFileSync(f, 'utf8');
    const re = /\/\*\*((?:(?!\*\/)[\s\S])*)\*\/\nexport (?:const (\w+) = (?:\(([^)]*)\)|(\w+)) =>|function (\w+)\(([^)]*)\))/g;
    for (const m of src.matchAll(re)) {
      const doc = m[1], name = m[2] ?? m[5], params = (m[3] ?? m[4] ?? m[6] ?? '').trim();
      if (params && !/@param/.test(doc)) missing.push(`${relative(ROOT, f)} ${name}`);
    }
  }
  assert.deepEqual(missing, [], `fonctions sans @param :\n${missing.join('\n')}`);
});

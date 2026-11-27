#!/usr/bin/env node
/**
 * @file Recopie le worklet de RustySynth du sous-module `vendor/rustysynth` vers
 * `output/rustysynth/rustysynth-processor.js`, en tête de documentation comprise. Appelé par
 * `make rustysynth`, après la construction du module WebAssembly.
 *
 *     node scripts/rustysynth-copie.js
 *
 * Le worklet copié porte un bloc `@file` (exigé par tests/documentation.test.js) qui donne le
 * commit du sous-module ; le reste est identique à l'original, ce que vérifie
 * tests/rustysynth.test.js quand le sous-module est présent.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/** Racine du projet. */
const ROOT = fileURLToPath(new URL('..', import.meta.url));

/** Worklet d'origine, dans le sous-module. */
export const SOURCE = `${ROOT}vendor/rustysynth/rustysynth_wasm/web/rustysynth-processor.js`;

/** Worklet copié, servi par la page et par l'exécuteur headless. */
export const COPIE = `${ROOT}output/rustysynth/rustysynth-processor.js`;

/**
 * Tête ajoutée au worklet copié.
 * @param {string} commit Commit du sous-module (abrégé).
 * @returns {string}
 */
export function header(commit) {
  return [
    '/**',
    ' * @file AudioWorkletProcessor de RustySynth (WebAssembly), copié tel quel du sous-module',
    ` * vendor/rustysynth (https://github.com/sletz/rustysynth, branche wasm, commit ${commit}),`,
    ' * fichier rustysynth_wasm/web/rustysynth-processor.js, avec rustysynth_wasm.wasm et LICENSE.txt.',
    ' * Ne pas modifier ici : modifier là-bas, puis `make rustysynth`. Utilisé par output/rustysynth.js.',
    ' */',
    '',
    '',
  ].join('\n');
}

/**
 * Retire la tête ajoutée par {@link header} : rend le texte du worklet d'origine.
 * @param {string} copie Contenu du worklet copié.
 * @returns {string}
 */
export function withoutHeader(copie) {
  return copie.replace(/^\/\*\*[\s\S]*?\*\/\n\n/, '');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const commit = execFileSync('git', ['-C', `${ROOT}vendor/rustysynth`, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();
  writeFileSync(COPIE, header(commit) + readFileSync(SOURCE, 'utf8'));
  console.log(`worklet copié depuis vendor/rustysynth (commit ${commit})`);
}

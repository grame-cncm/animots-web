#!/usr/bin/env node
/**
 * @file Calcule une séquence de Gerland et l'exporte en fichier MIDI.
 *
 * Usage :
 *
 *     node scripts/export-mid.js <numéro|essai> [graine] [fin]
 *
 * - numéro : numéro de la séquence (1 à 36), ou nom d'un essai (cercle1, cercle2, tutti,
 *   alterne, essai, essai1bis) ;
 * - graine : graine de l'aléa (2013 par défaut), pour rejouer exactement la même partie ;
 * - fin : durée en noires (secondes à 60 BPM). Par défaut, tirée comme dans `g-parties`
 *   (`rnd` entre les bornes de `DUREES`).
 *
 * Écrit `out/sequence-<numéro>-<graine>.mid` (ou `out/<essai>-<graine>.mid`) et affiche un résumé : durée, nombre de notes,
 * notes par canal, plage des hauteurs, anomalies.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { seed, rnd, G, Score, PPQ, sharedGenerators } from '../core/index.js';
import { SEQUENCES, ESSAIS } from '../piece/gerland/sequences/index.js';
import { DUREES } from '../piece/gerland/config.js';
import { toSMF, inspectSMF } from '../output/smf.js';

const [num = '2', graine = '2013', finArg] = process.argv.slice(2);
const sequence = SEQUENCES[num];
const essai = ESSAIS[num];
if (!sequence && !essai) {
  console.error(`Inconnu : ${num}. Séquences 1 à 36, ou essais : ${Object.keys(ESSAIS).join(', ')}`);
  process.exit(1);
}

seed(Number(graine));
sharedGenerators.reset();
const score = new Score();
if (essai) essai(score);
else {
  const [min, max] = DUREES[num];
  sequence(score, G(0), finArg !== undefined ? G(Number(finArg)) : rnd(min, max));
}

const outDir = join(fileURLToPath(new URL('..', import.meta.url)), 'out');
mkdirSync(outDir, { recursive: true });
const file = join(outDir, `${essai ? num : `sequence-${num}`}-${graine}.mid`);
const bytes = toSMF(score);
writeFileSync(file, bytes);

const notes = score.notes();
const parCanal = {};
for (const n of notes) {
  const k = `${'ABCD'[n.port] ?? `port${n.port}-`}${n.chan + 1}`;
  parCanal[k] = (parCanal[k] ?? 0) + 1;
}
const pitches = notes.map((n) => n.pitch);
const smf = inspectSMF(bytes);
console.log(`${score.label} — graine ${graine}`);
console.log(`  durée        ${(score.end / PPQ).toFixed(1)} noires (${score.seconds(score.end).toFixed(1)} s)`);
console.log(`  notes        ${notes.length}${notes.length ? `, hauteurs ${Math.min(...pitches)} à ${Math.max(...pitches)}` : ''}`);
console.log(`  par canal    ${Object.entries(parCanal).sort(([a], [b]) => a.localeCompare(b, 'fr', { numeric: true })).map(([k, v]) => `${k}:${v}`).join(' ')}`);
console.log(`  fichier      ${file} (${smf.noteOn} note-on, ${smf.cc} CC, ${smf.bend} pitch-bend)`);
if (score.warnings.length) console.log(`  anomalies    ${score.warnings.length}\n    ${score.warnings.slice(0, 5).join('\n    ')}`);

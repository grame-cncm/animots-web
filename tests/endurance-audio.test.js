/**
 * @file Endurance audio accélérée (scripts/endurance-audio.js), version courte : 90 s de
 * l'installation rendues par le module RustySynth livré, avec un SoundFont fabriqué. La version
 * longue se lance par `make endurance-audio`.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { endurer, formatRapportAudio } from '../scripts/endurance-audio.js';
import { mergeGerland, writeSoundFont } from '../scripts/soundfont.js';
import { convertWithMossFile } from './soundfont-fixture.js';

/**
 * SoundFont fusionné à partir de trois fichiers fabriqués (banques 0, 1 et 16).
 * @returns {Buffer}
 */
const soundFont = () => writeSoundFont(mergeGerland([
  { name: 'ProgA1', read: () => convertWithMossFile('ProgA1') },
  { name: 'ProgA2', read: () => convertWithMossFile('ProgA2') },
  { name: 'ProgB1', read: () => convertWithMossFile('ProgB1', { p1: 60 }) },
]).soundFont);

test('endurance audio : 90 s rendues sans NaN, sans croissance de la mémoire du module, avec du son', async () => {
  const r = await endurer({ sf2: soundFont(), heures: 90 / 3600, graine: 2013 });
  assert.deepEqual(r.problemes, [], formatRapportAudio(r));
  assert.equal(r.invalides, 0);
  assert.equal(r.memoireFin, r.memoireDebut);
  assert.ok(r.parties >= 2, `${r.parties} parties`);
  assert.ok(r.crete > 0, 'la séquence 29 (partie 2) doit sonner');
  assert.ok(r.facteur > 1, `rendu ${r.facteur.toFixed(1)} fois plus vite que le temps réel`);
});

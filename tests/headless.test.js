/**
 * @file Tests de l'exécuteur headless : file d'attente datée de la sortie Node
 * (output/node-midi.js), options et sessions simulées de scripts/headless.js, et échantillonneur
 * intégré sous Node, muet (sauté si node-web-audio-api manque).
 *
 * Les sessions simulées n'ouvrent aucun port MIDI : les tests ne touchent pas à la configuration
 * MIDI de la machine. L'essai avec de vrais ports virtuels CoreMIDI se fait à la main (README).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ScheduledSink } from '../output/node-midi.js';
import { parseArgs } from '../scripts/headless.js';
import { writeSoundFont, mergeGerland } from '../scripts/soundfont.js';
import { convertWithMossFile } from './soundfont-fixture.js';

const SCRIPT = fileURLToPath(new URL('../scripts/headless.js', import.meta.url));

/**
 * File d'attente avec horloge factice et envois enregistrés.
 * @returns {{sink: ScheduledSink, clock: {t: number}, out: Array<[number, Array<number>]>}}
 */
function setup() {
  const clock = { t: 0 }, out = [];
  const sink = new ScheduledSink({ sendNow: (p, d) => out.push([p, d]), ports: () => [0, 1], now: () => clock.t });
  return { sink, clock, out };
}

test('ScheduledSink : n’envoie un message qu’à son heure, dans l’ordre', () => {
  const { sink, clock, out } = setup();
  sink.send(0, [0x90, 60, 90], 100);
  sink.send(1, [0x90, 61, 90], 50);
  sink.send(0, [0x80, 60, 0], 100);
  sink.flush();
  assert.equal(out.length, 0);
  clock.t = 60; sink.flush();
  assert.deepEqual(out, [[1, [0x90, 61, 90]]]);
  clock.t = 105; sink.flush();
  assert.deepEqual(out.slice(1), [[0, [0x90, 60, 90]], [0, [0x80, 60, 0]]]); // même heure : ordre d'arrivée
  assert.equal(sink.sent, 3);
  assert.equal(sink.maxLate, 10);
  assert.deepEqual(sink.ports(), [0, 1]);
});

test('ScheduledSink : clear annule ce qui est programmé', () => {
  const { sink, clock, out } = setup();
  sink.send(0, [0x90, 60, 90], 100);
  sink.clear();
  clock.t = 200; sink.flush();
  assert.equal(out.length, 0);
});

test('ScheduledSink : start et stopTimer vident la file en temps réel', async () => {
  const out = [];
  const sink = new ScheduledSink({ sendNow: (p, d) => out.push(d), ports: () => [0] });
  const due = performance.now() + 20;
  sink.send(0, [1], due);
  // Minuterie témoin, réglée sur la même heure. Quand les tests tournent en parallèle, la boucle
  // d'événements peut être bloquée plusieurs dizaines de millisecondes : la sortie ne peut pas
  // être plus à l'heure que cette boucle. On ne lui reproche que le retard qui lui est propre.
  let loopLate = 0;
  setTimeout(() => { loopLate = performance.now() - due; }, 20);
  sink.start();
  await new Promise((r) => setTimeout(r, 60));
  sink.stopTimer();
  assert.deepEqual(out, [[1]]);
  assert.ok(sink.maxLate < loopLate + 20, `retard ${sink.maxLate.toFixed(1)} ms, boucle d'événements ${loopLate.toFixed(1)} ms`);
});

test('parseArgs : options et erreurs', () => {
  assert.deepEqual(parseArgs(['--graine', '2013', '--sortie-a', 'IAC Bus 1', '--simule', '--duree', '5', '--eveille']), {
    graine: 2013, sortieA: 'IAC Bus 1', sortieB: null, simule: true, essai: null, duree: 5,
    journal: null, battement: null, eveille: true, liste: false,
    echantillonneur: null, carte: null, muet: false, cartes: false,
  });
  assert.throws(() => parseArgs(['--inconnue']), /option inconnue/);
  assert.throws(() => parseArgs(['--graine']), /valeur manquante/);
  assert.throws(() => parseArgs(['--essai', 'rien']), /essai inconnu/);
});

test('parseArgs : échantillonneur intégré, carte, muet, liste des cartes, et incompatibilités', () => {
  const o = parseArgs(['--echantillonneur', 'gerland.sf2', '--carte', 'MOTU']);
  assert.equal(o.echantillonneur, 'gerland.sf2');
  assert.equal(o.carte, 'MOTU');
  assert.equal(o.muet, false);
  assert.equal(parseArgs(['--echantillonneur', 'g.sf2', '--muet']).muet, true);
  assert.equal(parseArgs(['--cartes']).cartes, true);
  assert.throws(() => parseArgs(['--echantillonneur']), /valeur manquante/);
  assert.throws(() => parseArgs(['--simule', '--echantillonneur', 'g.sf2']), /--simule et --echantillonneur s’excluent/);
  assert.throws(() => parseArgs(['--muet']), /ne valent qu’avec --echantillonneur/);
  assert.throws(() => parseArgs(['--carte', 'MOTU']), /ne valent qu’avec --echantillonneur/);
  assert.throws(() => parseArgs(['--echantillonneur', 'g.sf2', '--carte', 'X', '--muet']), /s’excluent/);
});

/** node-web-audio-api est une dépendance facultative : sans lui, l'essai de l'échantillonneur est sauté. */
const webAudio = await import('node-web-audio-api').then(() => true, () => false);

test('échantillonneur muet sous Node : un SoundFont fabriqué, un essai joué, une crête non nulle', { skip: !webAudio && 'node-web-audio-api absent' }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'animots-'));
  try {
    const sf2 = join(dir, 'test.sf2');
    writeFileSync(sf2, writeSoundFont(mergeGerland([{ name: 'ProgA1', read: () => convertWithMossFile('ProgA1') }]).soundFont));
    const r = spawnSync(process.execPath, [SCRIPT, '--echantillonneur', sf2, '--muet', '--essai', 'alterne', '--duree', '2'], { encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /échantillonneur : .*test\.sf2 \(6 presets, gain 3 dB\), carte : aucune \(muet\)/);
    assert.match(r.stdout, /16 voies séparées/);
    const crete = Number(/crête de la dernière partie ([\d.]+)/.exec(r.stdout)?.[1]);
    assert.ok(crete > 0.001, `crête nulle :\n${r.stdout}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('échantillonneur : un SoundFont introuvable donne un message clair et le code 1', { skip: !webAudio && 'node-web-audio-api absent' }, () => {
  const r = spawnSync(process.execPath, [SCRIPT, '--echantillonneur', '/nulle/part.sf2', '--muet', '--duree', '1'], { encoding: 'utf8' });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /animots : .*nulle\/part\.sf2/);
});

test('session simulée : parties journalisées, battement écrit, arrêt propre', () => {
  const dir = mkdtempSync(join(tmpdir(), 'animots-'));
  try {
    const journal = join(dir, 'session.log'), battement = join(dir, 'battement');
    const r = spawnSync(process.execPath, [SCRIPT, '--simule', '--graine', '2013', '--duree', '1', '--journal', journal, '--battement', battement], { encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    const log = readFileSync(journal, 'utf8');
    assert.match(log, /démarrage, graine 2013/);
    assert.match(log, /partie 1 : SEQUENCE 1, 0:25, aléa 7dd/);
    assert.match(log, /arrêt \(durée de 1 s atteinte\)/);
    assert.ok(statSync(battement).size > 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('essai simulé : joue l’essai puis s’arrête', () => {
  const r = spawnSync(process.execPath, [SCRIPT, '--simule', '--essai', 'alterne', '--duree', '1'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /essai alterne/);
  assert.match(r.stdout, /ALTERNE, 16:34/);
});

test('option inconnue : message clair et code 1', () => {
  const r = spawnSync(process.execPath, [SCRIPT, '--nimporte'], { encoding: 'utf8' });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /animots : option inconnue : --nimporte/);
});

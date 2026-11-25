/**
 * @file Tests de la partition (core/score.js) et de l'export SMF (output/smf.js).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Score, PPQ } from '../core/index.js';
import { toSMF, inspectSMF } from '../output/smf.js';

test('curseur : pAbs, pRel, date', () => {
  const sc = new Score();
  sc.pAbs(100);
  sc.pRel(20);
  assert.equal(sc.date(), 120);
});

test('note : durée floor(dur × stac) − 1, super-canal -> port et canal', () => {
  const sc = new Score();
  sc.pAbs(5040);
  sc.note(18, 60, 5040, 100, 0.5);
  const [n] = sc.notes();
  assert.deepEqual([n.tick, n.port, n.chan, n.pitch, n.dur, n.vel], [5040, 1, 2, 60, 2519, 100]);
  assert.equal(sc.date(), 5040); // NOTES ne déplace pas le curseur
});

test('une note à la date 0 est écrite au tick 1, après les contrôleurs', () => {
  const sc = new Score();
  sc.cc(0, 0, 0, 9, 3);
  sc.note(0, 60, 5040, 100);
  const m = sc.messages();
  assert.equal(sc.notes()[0].tick, 1);
  assert.deepEqual(m.map((x) => [x.tick, x.kind]), [[0, 'cc'], [0, 'bend'], [1, 'noteon'], [5040, 'noteoff']]);
});

test('note de vélocité 0 : pas envoyée, mais compte dans la durée', () => {
  const sc = new Score();
  sc.note(0, 0, 25 * PPQ, 0);
  assert.equal(sc.notes().length, 0);
  assert.equal(sc.end, 1 + 25 * PPQ - 1);
});

test('hauteur fractionnaire : pitch-bend et arrondi au pair', () => {
  const sc = new Score();
  sc.pAbs(100);
  sc.note(0, 60.5, 5040, 100);
  sc.pAbs(10000);
  sc.note(0, 62, 5040, 100);
  const bends = sc.messages().filter((m) => m.kind === 'bend');
  assert.equal(sc.notes()[0].pitch, 60); // (round 60.5) = 60
  assert.equal(bends.length, 2);
  assert.equal(bends[0].tick, 99);
  assert.equal((bends[0].data[1] | (bends[0].data[2] << 7)) - 8192, Math.round(8192 / 7 / 2));
  assert.equal((bends[1].data[1] | (bends[1].data[2] << 7)) - 8192, 0);
});

test('pitch-bend dédoublonné dans l’ordre du temps, pas dans l’ordre d’écriture', () => {
  const sc = new Score();
  sc.pAbs(1000); sc.note(0, 60, 100, 90); // écrit en premier, mais plus tard dans le temps
  sc.pAbs(10); sc.note(0, 61, 100, 90);
  const bends = sc.messages().filter((m) => m.kind === 'bend');
  assert.equal(bends.length, 1);
  assert.equal(bends[0].tick, 9); // émis avant la note la plus ancienne
});

test('à tick égal : note-off avant contrôleurs, avant note-on', () => {
  const sc = new Score();
  sc.pAbs(100); sc.note(3, 70, 51, 90); // note-off au tick 150
  sc.cc(150, 0, 3, 9, 2);
  sc.pAbs(150); sc.note(3, 70, 100, 90);
  const at150 = sc.messages().filter((m) => m.tick === 150).map((m) => m.kind);
  assert.deepEqual(at150, ['noteoff', 'cc', 'noteon']);
});

test('valeurs hors limites : signalées et bornées à 7 bits', () => {
  const sc = new Score();
  sc.pAbs(10);
  sc.note(0, 130, 100, 200);
  assert.equal(sc.warnings.length, 1);
  const on = sc.messages().find((m) => m.kind === 'noteon');
  assert.deepEqual(on.data, [0x90, 127, 127]);
});

test('seconds suit la carte des tempos', () => {
  const sc = new Score();
  assert.equal(sc.seconds(PPQ * 2), 2); // 60 BPM par défaut
  sc.tempo(0, 120);
  sc.tempo(PPQ * 4, 60);
  assert.equal(sc.seconds(PPQ * 4), 2);
  assert.equal(sc.seconds(PPQ * 6), 4);
});

test('toSMF : fichier format 1 valide, relu par inspectSMF', () => {
  const sc = new Score();
  sc.tempo(0, 60);
  for (let ch = 0; ch < 16; ch++) { sc.cc(0, 0, ch, 9, 1); sc.cc(0, 1, ch, 9, 3); }
  sc.pAbs(0); sc.note(16, 30, 10 * PPQ, 30);
  sc.pAbs(PPQ); sc.note(5, 72, PPQ / 2, 90);
  const info = inspectSMF(toSMF(sc));
  assert.deepEqual(
    [info.format, info.tracks, info.ppq, info.noteOn, info.noteOff, info.cc, info.bend, info.meta],
    [1, 3, 5040, 2, 2, 32, 2, 6],
  );
  assert.equal(info.lastTick, 1 + 10 * PPQ - 1);
});

test('inspectSMF refuse un fichier invalide', () => {
  assert.throws(() => inspectSMF(new Uint8Array([1, 2, 3, 4])), /MThd/);
});

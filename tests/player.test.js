/**
 * @file Tests de l'ordonnanceur (output/player.js), avec une horloge et une sortie factices.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Score, PPQ, seed, sharedGenerators } from '../core/index.js';
import { Player } from '../output/player.js';
import { gParties, calculPartie } from '../piece/gerland/parties.js';
import { ESSAIS } from '../piece/gerland/sequences/index.js';

/**
 * Sortie factice : garde tous les messages reçus.
 * @param {Array<number>} [ports=[0, 1]] Ports reliés.
 * @returns {{sent: Array<{port: number, data: Array<number>, time: number}>, send: Function, ports: Function, cleared: number, clear: Function}}
 */
function fakeSink(ports = [0, 1]) {
  const sink = { sent: [], cleared: 0 };
  sink.send = (port, data, time) => sink.sent.push({ port, data, time });
  sink.ports = () => ports;
  sink.clear = () => { sink.cleared++; };
  return sink;
}

/**
 * Horloge factice réglable.
 * @returns {{t: number, now: () => number}}
 */
function fakeClock() {
  const c = { t: 1000 };
  c.now = () => c.t;
  return c;
}

/**
 * Partition de n noires avec une note par noire sur le canal 0.
 * @param {number} n
 * @param {string} label
 * @returns {Score}
 */
function beats(n, label) {
  const sc = new Score();
  sc.label = label;
  sc.tempo(0, 60);
  for (let k = 0; k < n; k++) { sc.pAbs(k * PPQ); sc.note(0, 60 + k, PPQ / 2, 90); }
  sc.end = n * PPQ;
  return sc;
}

/**
 * Fait avancer l'horloge par pas de 25 ms en battant.
 * @param {Player} player
 * @param {{t: number}} clock
 * @param {number} ms
 * @returns {void}
 */
function run(player, clock, ms) {
  for (let k = 0; k < ms / 25; k++) { clock.t += 25; player.tick(); }
}

test('playOnce : messages envoyés en avance, avec leur heure exacte', () => {
  const clock = fakeClock(), sink = fakeSink();
  const player = new Player({ sink, now: clock.now, lookahead: 1000, startDelay: 200 });
  player.playOnce(beats(4, 'X'));
  // au démarrage, la fenêtre couvre [1000, 2000] : la note du temps 0 (1200 ms) seulement
  const ons = () => sink.sent.filter((m) => (m.data[0] & 0xf0) === 0x90);
  assert.deepEqual(ons().map((m) => m.time), [1200 + 1000 / PPQ]); // note écrite au tick 1
  run(player, clock, 1000);
  assert.deepEqual(ons().map((m) => Math.round(m.time)), [1200, 2200]);
  run(player, clock, 4000);
  assert.equal(ons().length, 4);
  assert.equal(player.state, 'arrêt'); // fin de la partition : arrêt tout seul
});

test('une heure en retard d’un battement ne décale rien', () => {
  const clock = fakeClock(), sink = fakeSink();
  const player = new Player({ sink, now: clock.now });
  player.playOnce(beats(3, 'X'));
  clock.t += 700; player.tick(); // un seul battement après 700 ms
  clock.t += 700; player.tick();
  const times = sink.sent.filter((m) => (m.data[0] & 0xf0) === 0x90).map((m) => Math.round(m.time));
  assert.deepEqual(times, [1200, 2200, 3200]);
});

test('boucle : la partie suivante commence exactement à la fin de la précédente', () => {
  const clock = fakeClock(), sink = fakeSink();
  let k = 0;
  const parts = [];
  const player = new Player({ sink, now: clock.now, onPart: (sc, start, end) => parts.push([sc.label, Math.round(start), Math.round(end)]) });
  player.startLoop(() => beats(2, `P${k++}`));
  run(player, clock, 6100);
  assert.deepEqual(parts.slice(0, 3), [['P0', 1200, 3200], ['P1', 3200, 5200], ['P2', 5200, 7200]]);
  assert.equal(player.state, 'boucle');
  assert.equal(player.current().score.label, 'P2');
});

test('boucle : une partie vide (durée nulle) est annoncée puis passée, la boucle continue', () => {
  const clock = fakeClock(), sink = fakeSink();
  const parts = [];
  const states = [];
  // P0 normale, puis deux parties vides de suite, puis des parties normales
  const suite = ['P0', 'vide1', 'vide2'];
  let k = 0;
  const player = new Player({
    sink, now: clock.now,
    onPart: (sc, start, end) => parts.push([sc.label, Math.round(start), Math.round(end)]),
    onState: (s) => states.push(s),
  });
  player.startLoop(() => {
    const label = suite[k] ?? `P${k}`;
    k++;
    if (label.startsWith('vide')) { const sc = new Score(); sc.label = label; return sc; }
    return beats(2, label);
  });
  run(player, clock, 6100);
  assert.deepEqual(parts.slice(0, 5), [
    ['P0', 1200, 3200], ['vide1', 3200, 3200], ['vide2', 3200, 3200], ['P3', 3200, 5200], ['P4', 5200, 7200],
  ]);
  assert.equal(player.state, 'boucle');
  assert.ok(!states.includes('arrêt'), `la boucle ne doit pas s’arrêter (${states.join(', ')})`);
});

test('boucle : des parties toutes vides ne bloquent pas un battement', () => {
  const clock = fakeClock(), sink = fakeSink();
  let calls = 0;
  const player = new Player({ sink, now: clock.now });
  player.startLoop(() => { calls++; const sc = new Score(); sc.label = 'vide'; return sc; });
  clock.t += 300;
  player.tick();
  assert.ok(calls <= Player.MAX_PARTS_PER_TICK + 2, `${calls} parties calculées en un battement`);
  assert.equal(player.state, 'boucle');
});

test('Gerland, graine 7 : la partie 2 est vide (séquence 1, comme en Lisp), la boucle continue', () => {
  const clock = fakeClock(), sink = fakeSink();
  const parts = [];
  seed(7);
  sharedGenerators.reset();
  const parties = gParties();
  const player = new Player({ sink, now: clock.now, onPart: (sc, start, end) => parts.push([sc.label, Math.round((end - start) / 1000)]) });
  player.startLoop(() => calculPartie(parties));
  run(player, clock, 55000); // la séquence 6 commence après 25 s + 0 s + 25 s
  assert.deepEqual(parts.slice(0, 4), [['SEQUENCE 1', 25], ['SEQUENCE 1', 0], ['SEQUENCE 1', 25], ['SEQUENCE 6', 362]]);
  assert.equal(player.state, 'boucle');
});

test('stop : note-off des notes actives, CC123 et CC120 maintenant et après la fenêtre', () => {
  const clock = fakeClock(), sink = fakeSink([0, 1]);
  const player = new Player({ sink, now: clock.now, lookahead: 1000 });
  const sc = new Score();
  sc.pAbs(0); sc.note(17, 40, 10 * PPQ, 30); // note tenue sur B2
  sc.end = 10 * PPQ;
  player.playOnce(sc);
  run(player, clock, 500);
  const before = sink.sent.length;
  player.stop();
  const after = sink.sent.slice(before);
  assert.deepEqual(after[0], { port: 1, data: [0x81, 40, 0], time: clock.t });
  const cc = after.filter((m) => (m.data[0] & 0xf0) === 0xb0);
  assert.equal(cc.length, 2 * 2 * 16 * 2); // 2 heures × 2 ports × 16 canaux × (CC123, CC120)
  assert.deepEqual([...new Set(cc.map((m) => m.time))], [clock.t, clock.t + 1050]);
  assert.equal(sink.cleared, 1);
  assert.equal(player.state, 'arrêt');
  assert.equal(player.active.size, 0);
  run(player, clock, 2000);
  assert.equal(sink.sent.length, before + after.length); // plus rien après l'arrêt
});

test('stop sans lecture : rien n’est envoyé', () => {
  const sink = fakeSink();
  new Player({ sink, now: () => 0 }).stop();
  assert.equal(sink.sent.length, 0);
});

test('onState signale les changements d’état', () => {
  const clock = fakeClock(), states = [];
  const player = new Player({ sink: fakeSink(), now: clock.now, onState: (s) => states.push(s) });
  player.startLoop(() => beats(1, 'A'));
  player.playOnce(beats(1, 'B'));
  run(player, clock, 3000);
  assert.deepEqual(states, ['boucle', 'arrêt', 'unique', 'arrêt']);
});

test('Gerland : 3 parties enchaînées, notes actives cohérentes, pas d’écart entre parties', () => {
  seed(5);
  sharedGenerators.reset();
  const parties = gParties();
  const clock = fakeClock(), sink = fakeSink([0, 1]), spans = [];
  const player = new Player({ sink, now: clock.now, onPart: (sc, s, e) => spans.push([sc.label, s, e]) });
  player.startLoop(() => calculPartie(parties));
  // avance par grands pas jusqu'au début de la 3e partie
  while (spans.length < 3) { clock.t += 250; player.tick(); }
  assert.equal(spans[0][0], 'SEQUENCE 1');
  assert.equal(spans[1][1], spans[0][2]);
  assert.equal(spans[2][1], spans[1][2]);
  // chaque note-on envoyée a son note-off, sauf les notes encore actives
  const ons = sink.sent.filter((m) => (m.data[0] & 0xf0) === 0x90).length;
  const offs = sink.sent.filter((m) => (m.data[0] & 0xf0) === 0x80).length;
  const active = [...player.active.values()].reduce((a, b) => a + b, 0);
  assert.equal(ons - offs, active);
  player.stop();
});

test('essai Cercle1 : 1000 notes envoyées dans l’ordre du temps', () => {
  const clock = fakeClock(), sink = fakeSink();
  const sc = new Score();
  ESSAIS.cercle1(sc);
  const player = new Player({ sink, now: clock.now });
  player.playOnce(sc);
  while (player.state !== 'arrêt') { clock.t += 1000; player.tick(); }
  const ons = sink.sent.filter((m) => (m.data[0] & 0xf0) === 0x90);
  assert.equal(ons.length, 1000);
  for (let k = 1; k < sink.sent.length; k++) assert.ok(sink.sent[k].time >= sink.sent[k - 1].time);
});

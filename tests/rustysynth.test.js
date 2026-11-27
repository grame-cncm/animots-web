/**
 * @file Tests de la sortie RustySynth (output/rustysynth.js) : correspondance avec le multi
 * Kontakt (instances, ports, CC9, pitch-bend), heure, chargement, et module WebAssembly livré.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { SOURCE, COPIE, header, withoutHeader } from '../scripts/rustysynth-copie.js';
import { route, initMessages, bendRange, soundFontGain, audioTime, connectOutput, RustySynthSink, INSTANCES, PORTS, GROUP_BEND_RANGE } from '../output/rustysynth.js';

/**
 * Message unique pour une instance.
 * @param {number} instance
 * @param {Array<number>} data
 * @returns {Array<{instance: number, data: Array<number>}>}
 */
const one = (instance, data) => [{ instance, data }];

test('route : le canal donne l’instance (l’enceinte), le port donne le canal MIDI', () => {
  assert.deepEqual(route(0, [0x95, 60, 100]), one(5, [0x90, 60, 100])); // A6
  assert.deepEqual(route(1, [0x95, 60, 100]), one(5, [0x91, 60, 100])); // B6
  assert.deepEqual(route(1, [0x8f, 72, 0]), one(15, [0x81, 72, 0])); // B16
  assert.deepEqual(route(0, [0xe3, 0, 70]), one(3, [0xe0, 0, 70])); // pitch-bend
  assert.deepEqual(route(1, [0xb2, 123, 0]), one(2, [0xb1, 123, 0])); // CC123 de l'arrêt
});

test('route : le CC9 (groupe P1 à P6) devient le programme v − 1, avec l’étendue de pitch-bend du groupe', () => {
  assert.deepEqual(GROUP_BEND_RANGE.slice(1), [2, 2, 2, 2, 7, 7]);
  for (let v = 1; v <= 6; v++) {
    const out = route(1, [0xb7, 9, v]);
    assert.ok(out.every((m) => m.instance === 7));
    assert.deepEqual(out.map((m) => m.data), [[0xc1, v - 1, 0], ...bendRange(1, v >= 5 ? 7 : 2)]);
  }
  assert.deepEqual(route(0, [0xb0, 9, 0])[0].data, [0xc0, 0, 0]); // hors plage : P1
  assert.deepEqual(route(0, [0xb0, 9, 9])[0].data, [0xc0, 5, 0]); // hors plage : P6
});

test('bendRange : RPN 0, puis RPN nul', () => {
  assert.deepEqual(bendRange(1, 7), [[0xb1, 101, 0], [0xb1, 100, 0], [0xb1, 6, 7], [0xb1, 38, 0], [0xb1, 101, 127], [0xb1, 100, 127]]);
});

test('route : les ports au-delà de B ne sont pas joués', () => {
  assert.deepEqual(route(2, [0x90, 60, 100]), []);
  assert.deepEqual(PORTS, [0, 1]);
});

test('initMessages : banque de l’instrument du multi, groupe P1 et son pitch-bend, sur le canal de chaque port', () => {
  assert.deepEqual(initMessages(4), [
    [0xb0, 0, 4], [0xc0, 0, 0], ...bendRange(0, 2), // A5 : banque 4
    [0xb1, 0, 20], [0xc1, 0, 0], ...bendRange(1, 2), // B5 : banque 20
  ]);
  assert.deepEqual(initMessages(15)[0], [0xb0, 0, 15]);
  assert.deepEqual(initMessages(15)[8], [0xb1, 0, 31]);
});

test('soundFontGain : lit le gain noté par scripts/soundfont.js, 0 sinon', () => {
  const enc = (s) => new TextEncoder().encode(s);
  assert.equal(soundFontGain(enc('RIFF....sfbkLIST....INFOICMT animots-gain-db=6.28\nMulti')), 6.28);
  assert.equal(soundFontGain(enc('RIFF....sfbkLIST....INFOINAM GeneralUser')), 0);
});

test('audioTime : relie performance.now() à l’heure du contexte par le son qui sort', () => {
  const ctx = { currentTime: 10, getOutputTimestamp: () => ({ contextTime: 9.9, performanceTime: 5000 }) };
  assert.equal(audioTime(ctx, 6000), 10.9);
  // contexte suspendu (performanceTime nul), ou sans getOutputTimestamp : currentTime
  const suspendu = { currentTime: 2, getOutputTimestamp: () => ({ contextTime: 0, performanceTime: 0 }) };
  assert.equal(audioTime(suspendu, 1500, () => 1000), 2.5);
  assert.equal(audioTime({ currentTime: 2 }, 1500, () => 1000), 2.5);
  // node-web-audio-api : getOutputTimestamp existe mais lève une exception
  const node = { currentTime: 2, getOutputTimestamp() { throw new Error('not yet implemented'); } };
  assert.equal(audioTime(node, 1500, () => 1000), 2.5);
});

/**
 * Double d'un nœud de worklet : garde les messages postés et répond au chargement.
 * @param {(m: any) => object | null} [reply] Réponse du worklet au message de chargement.
 * @returns {{port: {postMessage: Function, onmessage: Function | null}, posted: Array<any>, connected: Array<any>, connect: Function}}
 */
function fakeNode(reply = () => ({ type: 'ready', presets: 6, instances: INSTANCES })) {
  const node = {
    posted: [],
    connected: [],
    connect(dest) { node.connected.push(dest); },
    port: {
      onmessage: null,
      postMessage(m) {
        node.posted.push(m);
        const r = m.type === 'load' ? reply(m) : null;
        if (r) queueMicrotask(() => node.port.onmessage?.({ data: r }));
      },
    },
  };
  return node;
}

/**
 * Double d'un AudioContext.
 * @param {number} maxChannelCount Voies de la carte son.
 * @returns {object}
 */
function fakeContext(maxChannelCount) {
  const modules = [];
  const merges = [];
  return {
    modules,
    merges,
    currentTime: 0,
    destination: { maxChannelCount, channelCount: 2, channelCountMode: 'max', channelInterpretation: 'speakers' },
    audioWorklet: { addModule: async (url) => { modules.push(url); } },
    createChannelSplitter: (n) => {
      const links = [];
      return { n, links, connect: (to, from, into) => links.push([from, into]) };
    },
    createChannelMerger: () => { const m = { connect() {} }; merges.push(m); return m; },
  };
}

test('connectOutput : 16 voies séparées si la carte les a, sinon repli en stéréo', () => {
  const big = fakeContext(32), node = fakeNode();
  assert.deepEqual(connectOutput(big, node, 16), { separees: true, max: 32 });
  assert.equal(big.destination.channelCount, 16);
  assert.equal(big.destination.channelInterpretation, 'discrete');
  assert.deepEqual(node.connected, [big.destination]);

  const small = fakeContext(2), node2 = fakeNode();
  assert.deepEqual(connectOutput(small, node2, 16), { separees: false, max: 2 });
  const split = node2.connected[0];
  assert.equal(split.n, 16);
  assert.deepEqual(split.links.slice(0, 3), [[0, 0], [1, 1], [2, 0]]);
});

test('RustySynthSink.create : charge le worklet, le module et le SoundFont, puis prépare les 16 instances', async () => {
  const ctx = fakeContext(16);
  let node;
  /** Classe de nœud qui renvoie le double. */
  class Node { constructor(c, name, options) { node = fakeNode(); Object.assign(node, { name, options }); return node; } }
  const sf2 = new TextEncoder().encode('RIFF....sfbkLIST....INFOICMT animots-gain-db=6.02\n').buffer, wasm = new ArrayBuffer(4);
  const r = await RustySynthSink.create(ctx, { sf2, wasm, processorUrl: 'p.js', AudioWorkletNode: Node });
  assert.deepEqual(ctx.modules, ['p.js']);
  assert.equal(node.name, 'rustysynth');
  assert.deepEqual(node.options.outputChannelCount, [16]);
  assert.equal(r.presets, 6);
  assert.equal(r.separees, true);
  assert.equal(r.gainDb, 6.02);
  assert.equal(node.posted[0].type, 'load');
  // gain noté dans le SoundFont : volume par défaut de RustySynth (0,5) × 10^(6,02/20) ≈ 1
  assert.equal(node.posted[1].type, 'volume');
  assert.ok(Math.abs(node.posted[1].value - 1) < 0.001);
  const init = node.posted.slice(2);
  assert.equal(init.length, INSTANCES * initMessages(0).length);
  assert.deepEqual(init[0], { type: 'midi', time: 0, instance: 0, data: [0xb0, 0, 0] });
  assert.deepEqual(init.at(-1).instance, 15);
  assert.ok(init.some((m) => m.instance === 15 && m.data[0] === 0xb1 && m.data[1] === 0 && m.data[2] === 31));
  // les niveaux renvoyés par le worklet donnent la crête de la sortie
  assert.equal(r.sink.level(), 0);
  node.port.onmessage({ data: { type: 'levels', peaks: Float32Array.from({ length: 16 }, (_, i) => (i === 4 ? 0.25 : 0)) } });
  assert.equal(r.sink.level(), 0.25);
});

test('RustySynthSink.create : une erreur du worklet est rendue', async () => {
  /** Classe de nœud dont le worklet refuse le SoundFont. */
  class Node { constructor() { return fakeNode(() => ({ type: 'error', message: 'SoundFont: invalide' })); } }
  await assert.rejects(
    RustySynthSink.create(fakeContext(2), { sf2: new ArrayBuffer(1), wasm: new ArrayBuffer(1), processorUrl: 'p.js', AudioWorkletNode: Node }),
    /RustySynth : SoundFont: invalide/,
  );
});

test('RustySynthSink : send convertit l’heure et route, ignore le port C ; clear vide la file du worklet', () => {
  const node = fakeNode();
  const sink = new RustySynthSink(node, (ms) => ms / 1000 + 100);
  sink.send(1, [0x93, 64, 90], 2500);
  sink.send(2, [0x90, 60, 100], 2500);
  sink.send(0, [0xb3, 9, 5], 3000); // CC9 → programme, puis étendue du pitch-bend, à la même heure
  sink.clear();
  assert.deepEqual(node.posted.slice(0, 2), [
    { type: 'midi', time: 102.5, instance: 3, data: [0x91, 64, 90] },
    { type: 'midi', time: 103, instance: 3, data: [0xc0, 4, 0] },
  ]);
  assert.equal(node.posted.length, 2 + 6 + 1);
  assert.ok(node.posted.slice(1, 8).every((m) => m.time === 103 && m.instance === 3));
  assert.deepEqual(node.posted.at(-1), { type: 'clear' });
  assert.equal(sink.dropped, 1);
  assert.deepEqual(sink.ports(), [0, 1]);
});

test('module WebAssembly livré : sans import, avec les exports attendus, et refuse un SoundFont invalide', async () => {
  const bytes = readFileSync(new URL('../output/rustysynth/rustysynth_wasm.wasm', import.meta.url));
  const { instance } = await WebAssembly.instantiate(bytes, {});
  const ex = instance.exports;
  for (const name of ['rs_sf2_buffer', 'rs_load_soundfont', 'rs_init', 'rs_midi', 'rs_render', 'rs_note_off_all', 'rs_reset', 'rs_error_ptr', 'rs_error_len']) {
    assert.equal(typeof ex[name], 'function', name);
  }
  const ptr = ex.rs_sf2_buffer(4); // peut agrandir la mémoire : lire memory.buffer après
  new Uint8Array(ex.memory.buffer, ptr, 4).set([1, 2, 3, 4]);
  assert.equal(ex.rs_load_soundfont(), -1);
  const msg = new TextDecoder().decode(new Uint8Array(ex.memory.buffer, ex.rs_error_ptr(), ex.rs_error_len()));
  assert.match(msg, /SoundFont/);
});

const sousModule = existsSync(SOURCE);

test('copie du worklet : identique à celui du sous-module vendor/rustysynth, en-tête mis à part', { skip: !sousModule && 'sous-module vendor/rustysynth absent (git submodule update --init)' }, () => {
  const copie = readFileSync(COPIE, 'utf8');
  assert.match(copie, /^\/\*\*\n \* @file /);
  assert.equal(withoutHeader(copie), readFileSync(SOURCE, 'utf8'), 'worklet copié différent : lancer make rustysynth');
  const commit = execFileSync('git', ['-C', fileURLToPath(new URL('../vendor/rustysynth', import.meta.url)), 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();
  assert.ok(copie.startsWith(header(commit)), `l'en-tête doit citer le commit du sous-module (${commit}) : lancer make rustysynth`);
});

test('licence copiée : identique à celle du sous-module', { skip: !sousModule && 'sous-module vendor/rustysynth absent' }, () => {
  const licence = fileURLToPath(new URL('../output/rustysynth/LICENSE.txt', import.meta.url));
  const source = fileURLToPath(new URL('../vendor/rustysynth/LICENSE.txt', import.meta.url));
  assert.equal(readFileSync(licence, 'utf8'), readFileSync(source, 'utf8'));
});

test('header et withoutHeader : la tête retirée rend le texte d’origine', () => {
  const original = '// AudioWorkletProcessor\nclass X {}\n';
  assert.equal(withoutHeader(header('abc1234') + original), original);
});

test('RustySynthSink.stalled : bloqué sans relevé de niveaux depuis 15 s', () => {
  const sink = new RustySynthSink({ port: { postMessage() {} } }, (ms) => ms / 1000);
  const t = sink.lastLevels;
  assert.equal(sink.stalled(t + 14000), false);
  assert.equal(sink.stalled(t + 16000), true);
  sink.setPeaks(new Array(16).fill(0));
  assert.ok(sink.lastLevels >= t);
  assert.equal(sink.stalled(sink.lastLevels + 1000), false);
  assert.equal(sink.stalled(sink.lastLevels + 3000, 2000), true);
});

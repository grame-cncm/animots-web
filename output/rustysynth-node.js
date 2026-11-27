/**
 * @file Échantillonneur intégré sous Node.js : la sortie RustySynth (`output/rustysynth.js`)
 * dans l'AudioContext de node-web-audio-api (IRCAM), pour l'exécuteur headless.
 *
 * node-web-audio-api est une dépendance facultative, comme `@julusian/midi` : ce module ne
 * l'importe qu'au moment de s'en servir, et dit clairement qu'elle manque. Le worklet et le
 * module WebAssembly sont ceux de la page (`output/rustysynth/`) : le même code joue dans le
 * navigateur et sous Node.
 *
 * La carte son se choisit par une partie de son nom (`sinkId` = son `deviceId`). Si elle a au
 * moins 16 voies, chaque enceinte a la sienne ; sinon, `connectOutput` replie les enceintes en
 * stéréo. `muet` rend sans aucune sortie (`sinkId: {type: 'none'}`), pour les essais.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { RustySynthSink } from './rustysynth.js';

/**
 * Importe node-web-audio-api, ou explique comment l'installer.
 * @returns {Promise<any>}
 */
async function loadWebAudio() {
  try {
    return await import('node-web-audio-api');
  } catch (e) {
    throw new Error(`node-web-audio-api indisponible (${e.code ?? e.message}) : lancer « npm install », qui installe les dépendances facultatives`);
  }
}

/**
 * Contenu d'un fichier, en ArrayBuffer à lui seul (transférable au worklet).
 * @param {string} path
 * @returns {ArrayBuffer}
 */
function arrayBufferOf(path) {
  const b = readFileSync(path);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
}

/**
 * Sorties audio du système.
 * @returns {Promise<Array<{id: string, label: string}>>}
 */
export async function listAudioOutputs() {
  const { mediaDevices } = await loadWebAudio();
  return (await mediaDevices.enumerateDevices())
    .filter((d) => d.kind === 'audiooutput')
    .map((d) => ({ id: d.deviceId, label: d.label }));
}

/**
 * Sortie RustySynth complétée pour l'exécuteur headless.
 * @typedef {RustySynthSink & {names: Array<string>, carte: string, presets: number, separees: boolean, max: number, gainDb: number, close: () => Promise<void>}} NodeRustySynthSink
 */

/**
 * Ouvre l'échantillonneur intégré sous Node.
 * @param {object} o
 * @param {string} o.soundFont Chemin du SoundFont (`gerland.sf2`, fait par `scripts/soundfont.js`).
 * @param {string|null} [o.carte] Partie du nom de la carte son ; la sortie par défaut sinon.
 * @param {boolean} [o.muet=false] Aucune sortie audio : le rendu tourne quand même (essais).
 * @returns {Promise<NodeRustySynthSink>}
 * @throws {Error} Si node-web-audio-api manque, si la carte est introuvable ou si le SoundFont est refusé.
 */
export async function openRustySynthNode({ soundFont, carte = null, muet = false }) {
  const wa = await loadWebAudio();
  let sinkId = '';
  let carteNom = 'sortie par défaut du système';
  if (muet) {
    sinkId = { type: 'none' };
    carteNom = 'aucune (muet)';
  } else if (carte) {
    const outs = await listAudioOutputs();
    const found = outs.find((d) => d.label.toLowerCase().includes(carte.toLowerCase()));
    if (!found) throw new Error(`carte audio introuvable : « ${carte} » (sorties : ${outs.map((d) => d.label).join(', ') || 'aucune'})`);
    sinkId = found.id;
    carteNom = found.label;
  }
  const ctx = new wa.AudioContext({ latencyHint: 'playback', ...(sinkId ? { sinkId } : {}) });
  try {
    const r = await RustySynthSink.create(ctx, {
      sf2: arrayBufferOf(soundFont),
      wasm: arrayBufferOf(fileURLToPath(new URL('./rustysynth/rustysynth_wasm.wasm', import.meta.url))),
      processorUrl: fileURLToPath(new URL('./rustysynth/rustysynth-processor.js', import.meta.url)),
      AudioWorkletNode: wa.AudioWorkletNode,
    });
    await ctx.resume();
    let fermeture = false;
    // un contexte suspendu (changement de périphérique, réveil de la machine) est relancé
    ctx.addEventListener?.('statechange', () => {
      if (ctx.state === 'suspended' && !fermeture) ctx.resume().catch(() => {});
    });
    return Object.assign(r.sink, {
      names: ['échantillonneur', 'échantillonneur'],
      carte: carteNom,
      presets: r.presets,
      separees: r.separees,
      max: r.max,
      gainDb: r.gainDb,
      /**
       * Ferme le contexte audio (à l'arrêt, après la coupure du son).
       * @returns {Promise<void>}
       */
      async close() { fermeture = true; await ctx.close(); },
    });
  } catch (e) {
    await ctx.close().catch(() => {});
    throw e;
  }
}

/**
 * @file Sortie « échantillonneur intégré » : RustySynth compilé en WebAssembly, dans un
 * AudioWorklet, à la place de Kontakt 8 (analyse et plan, section 5.6).
 *
 * Conforme à l'interface `Sink` de `output/player.js`. Elle ne dépend que d'un `AudioContext` :
 * celui de Chrome dans la page, et plus tard celui de node-web-audio-api dans l'exécuteur
 * headless (non essayé).
 *
 * ## Correspondance avec le multi Kontakt
 *
 * - **Une instance RustySynth par enceinte.** Un message du port p, canal c, va à l'instance c,
 *   sur son canal MIDI p : An et Bn sonnent sur l'enceinte n. L'instance n sort sur la voie n
 *   de la carte son (16 voies séparées), ou, si la carte en a moins, sur une paire stéréo.
 * - **CC9 → program change.** Le CC9 de valeur v (groupe P1 à P6) devient le programme v − 1 :
 *   le SF2 converti depuis le multi doit donc mettre le groupe Pn au preset n − 1.
 * - **Pitch-bend.** CLCE porte les hauteurs fractionnaires par un pitch-bend d'étendue
 *   `BEND_RANGE` (7 demi-tons) ; RustySynth part de 2. La sortie règle donc le RPN 0 de chaque
 *   canal au démarrage (`initMessages`).
 * - **Ports au-delà de B** (le port C de la séquence 21) : ignorés, comme dans le multi de 2013.
 *
 * ## Heure
 *
 * L'ordonnanceur date ses messages sur l'horloge `performance.now()`. La sortie les convertit
 * en heure de l'`AudioContext` par `getOutputTimestamp()`, qui relie les deux horloges au son
 * qui sort réellement. Le worklet garde les messages en file et les joue à leur heure, au bloc
 * RustySynth près (32 trames, 0,7 ms à 48 kHz).
 */

import { BEND_RANGE } from '../core/score.js';

/** Nombre d'instances : une par enceinte. */
export const INSTANCES = 16;

/** Ports de la partition joués par l'échantillonneur (0 = A, 1 = B). */
export const PORTS = [0, 1];

/**
 * Traduit un message de la partition pour l'échantillonneur.
 * @param {number} port Port de la partition (0 = A, 1 = B...).
 * @param {Array<number>} data Octets du message (statut, données).
 * @returns {{instance: number, data: Array<number>} | null} Instance et message, ou null si le
 *   port n'est pas joué.
 */
export function route(port, data) {
  if (!PORTS.includes(port)) return null;
  const command = data[0] & 0xf0, instance = data[0] & 0x0f;
  if (command === 0xb0 && data[1] === 9) return { instance, data: [0xc0 | port, Math.max(0, (data[2] ?? 1) - 1), 0] };
  return { instance, data: [command | port, data[1] ?? 0, data[2] ?? 0] };
}

/**
 * Messages qui préparent une instance : étendue du pitch-bend (RPN 0) sur le canal de chaque port,
 * puis RPN nul pour qu'un data entry ultérieur ne la modifie pas.
 * @param {number} [range=BEND_RANGE] Étendue en demi-tons.
 * @returns {Array<Array<number>>}
 */
export function initMessages(range = BEND_RANGE) {
  return PORTS.flatMap((p) => [
    [0xb0 | p, 101, 0], [0xb0 | p, 100, 0], [0xb0 | p, 6, range], [0xb0 | p, 38, 0],
    [0xb0 | p, 101, 127], [0xb0 | p, 100, 127],
  ]);
}

/**
 * Relie le nœud à la destination : une voie de la carte par instance si elle en a assez, sinon
 * repli sur une paire stéréo (instances impaires à gauche, paires à droite, en numérotant de 1).
 * @param {BaseAudioContext} ctx
 * @param {AudioNode} node Nœud à `channels` voies.
 * @param {number} channels
 * @returns {{separees: boolean, max: number}}
 */
export function connectOutput(ctx, node, channels) {
  const dest = ctx.destination;
  const max = dest.maxChannelCount;
  if (max >= channels) {
    dest.channelCount = channels;
    dest.channelCountMode = 'explicit';
    dest.channelInterpretation = 'discrete';
    node.connect(dest);
    return { separees: true, max };
  }
  const split = ctx.createChannelSplitter(channels);
  const merge = ctx.createChannelMerger(2);
  node.connect(split);
  for (let c = 0; c < channels; c++) split.connect(merge, c, c % 2);
  merge.connect(dest);
  return { separees: false, max };
}

/** Sortie vers RustySynth, conforme à l'interface `Sink` de `output/player.js`. */
export class RustySynthSink {
  /**
   * Utiliser plutôt `RustySynthSink.create`, qui charge le worklet, le module et le SoundFont.
   * @param {{port: MessagePort}} node Nœud du worklet (ou un double dans les tests).
   * @param {(ms: number) => number} toAudioTime Heure `performance.now()` → heure de l'AudioContext (s).
   */
  constructor(node, toAudioTime) {
    this.node = node;
    this.toAudioTime = toAudioTime;
    /** Messages ignorés, faute d'instance pour leur port. */
    this.dropped = 0;
    /** @type {Array<number>} Crête de chaque instance sur le dernier dixième de seconde, renvoyée par le worklet. */
    this.peaks = new Array(INSTANCES).fill(0);
  }

  /**
   * Crête la plus forte des 16 instances (0 : silence), d'après le dernier relevé du worklet.
   * @returns {number}
   */
  level() { return Math.max(...this.peaks); }

  /**
   * Charge l'échantillonneur et renvoie la sortie prête à jouer.
   * @param {BaseAudioContext} ctx Contexte audio (celui de la page, ou de node-web-audio-api).
   * @param {object} o
   * @param {ArrayBuffer} o.sf2 Contenu du fichier SoundFont (.sf2), transféré au worklet (inutilisable ensuite).
   * @param {ArrayBuffer} o.wasm Contenu de `rustysynth_wasm.wasm`, transféré de même.
   * @param {string} o.processorUrl Adresse de `rustysynth-processor.js`.
   * @param {typeof AudioWorkletNode} [o.AudioWorkletNode] Classe du nœud (globale par défaut).
   * @param {number} [o.blockSize=32] Bloc RustySynth : la résolution temporelle, en trames.
   * @param {number} [o.polyphony=64] Voix par instance.
   * @returns {Promise<{sink: RustySynthSink, presets: number, separees: boolean, max: number}>}
   */
  static async create(ctx, { sf2, wasm, processorUrl, AudioWorkletNode: Node = globalThis.AudioWorkletNode, blockSize = 32, polyphony = 64 }) {
    await ctx.audioWorklet.addModule(processorUrl);
    const node = new Node(ctx, 'rustysynth', {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [INSTANCES],
      processorOptions: { instances: INSTANCES, blockSize, polyphony, reverb: false, stereo: false },
    });
    const ready = new Promise((resolve, reject) => {
      node.port.onmessage = (e) => {
        if (e.data.type === 'ready') resolve(e.data.presets);
        else if (e.data.type === 'error') reject(new Error(`RustySynth : ${e.data.message}`));
      };
    });
    node.port.postMessage({ type: 'load', wasm, sf2 }, [wasm, sf2]);
    const presets = await ready;
    const { separees, max } = connectOutput(ctx, node, INSTANCES);
    const sink = new RustySynthSink(node, (ms) => audioTime(ctx, ms));
    node.port.onmessage = (e) => { if (e.data.type === 'levels') sink.peaks = Array.from(e.data.peaks); };
    for (let i = 0; i < INSTANCES; i++) {
      for (const data of initMessages()) node.port.postMessage({ type: 'midi', time: 0, instance: i, data });
    }
    return { sink, presets, separees, max };
  }

  /**
   * Envoie un message de la partition à son heure.
   * @param {number} port
   * @param {Array<number>} data
   * @param {number} time Heure sur l'horloge `performance.now()` (ms).
   * @returns {void}
   */
  send(port, data, time) {
    const r = route(port, data);
    if (!r) { this.dropped++; return; }
    this.node.port.postMessage({ type: 'midi', time: this.toAudioTime(time), instance: r.instance, data: r.data });
  }

  /**
   * Ports joués.
   * @returns {Array<number>}
   */
  ports() { return PORTS; }

  /**
   * Oublie les messages pas encore joués (appelé par `Player.stop`).
   * @returns {void}
   */
  clear() { this.node.port.postMessage({ type: 'clear' }); }
}

/**
 * Heure de l'AudioContext (s) qui correspond à une heure `performance.now()` (ms), d'après le
 * son qui sort (`getOutputTimestamp`), ou d'après `currentTime` quand le contexte ne la donne pas.
 * @param {BaseAudioContext & {getOutputTimestamp?: () => AudioTimestamp}} ctx
 * @param {number} ms
 * @param {() => number} [now] Horloge `performance.now()`.
 * @returns {number}
 */
export function audioTime(ctx, ms, now = () => performance.now()) {
  const ts = ctx.getOutputTimestamp?.();
  if (ts && ts.performanceTime > 0) return (ts.contextTime ?? 0) + (ms - ts.performanceTime) / 1000;
  return ctx.currentTime + (ms - now()) / 1000;
}

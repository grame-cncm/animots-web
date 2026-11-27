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
 * Le SoundFont attendu est celui que fabrique `scripts/soundfont.js` à partir du multi : banque
 * 0 à 15 pour A1 à A16, 16 à 31 pour B1 à B16, programme n − 1 pour le groupe Pn.
 *
 * - **Une instance RustySynth par enceinte.** Un message du port p, canal c, va à l'instance c,
 *   sur son canal MIDI p : An et Bn sonnent sur l'enceinte n. Au démarrage, la sortie choisit sur
 *   ce canal la banque de l'instrument (`initMessages`). L'instance n sort sur la voie n de la
 *   carte son (16 voies séparées), ou, si la carte en a moins, sur une paire stéréo.
 * - **CC9 → program change.** Le CC9 de valeur v (groupe P1 à P6) devient le programme v − 1.
 * - **Pitch-bend.** Dans le multi, l'étendue dépend du groupe : ±7 demi-tons pour P5 et P6,
 *   ±2 pour les autres (`GROUP_BEND_RANGE`). CLCE, lui, calcule toujours le pitch-bend des
 *   hauteurs fractionnaires pour 7 demi-tons (`BEND_RANGE`) : en 2013, une fraction jouée dans P1
 *   à P4 sonnait donc réduite aux 2/7. La sortie reproduit ce comportement : avec chaque CC9, elle
 *   règle l'étendue (RPN 0) du groupe choisi. RustySynth ne lit pas les modulateurs SF2, où
 *   ConvertWithMoss avait noté ces étendues.
 * - **Niveau.** `scripts/soundfont.js` décale les atténuations et note dans le commentaire du
 *   fichier le gain à rendre (`animots-gain-db=…`). La sortie l'applique au volume général.
 * - **Ports au-delà de B** (le port C de la séquence 21) : ignorés, comme dans le multi de 2013.
 *
 * ## Heure
 *
 * L'ordonnanceur date ses messages sur l'horloge `performance.now()`. La sortie les convertit
 * en heure de l'`AudioContext` par `getOutputTimestamp()`, qui relie les deux horloges au son
 * qui sort réellement. Le worklet garde les messages en file et les joue à leur heure, au bloc
 * RustySynth près (32 trames, 0,7 ms à 48 kHz).
 */

/** Nombre d'instances : une par enceinte. */
export const INSTANCES = 16;

/** Ports de la partition joués par l'échantillonneur (0 = A, 1 = B). */
export const PORTS = [0, 1];

/**
 * Étendue du pitch-bend (demi-tons) de chaque groupe du multi, indicée par le numéro du groupe
 * (1 à 6) : ±699 et ±702 cents pour P5 et P6, l'étendue par défaut de Kontakt (±2) ailleurs.
 */
export const GROUP_BEND_RANGE = [2, 2, 2, 2, 2, 7, 7];

/**
 * Messages qui règlent l'étendue du pitch-bend (RPN 0) d'un canal, puis RPN nul pour qu'un data
 * entry ultérieur ne la modifie pas.
 * @param {number} channel Canal MIDI (0 à 15).
 * @param {number} semitones
 * @returns {Array<Array<number>>}
 */
export function bendRange(channel, semitones) {
  const cc = 0xb0 | channel;
  return [[cc, 101, 0], [cc, 100, 0], [cc, 6, semitones], [cc, 38, 0], [cc, 101, 127], [cc, 100, 127]];
}

/**
 * Traduit un message de la partition pour l'échantillonneur.
 * @param {number} port Port de la partition (0 = A, 1 = B...).
 * @param {Array<number>} data Octets du message (statut, données).
 * @returns {Array<{instance: number, data: Array<number>}>} Messages pour une instance (aucun si
 *   le port n'est pas joué).
 */
export function route(port, data) {
  if (!PORTS.includes(port)) return [];
  const command = data[0] & 0xf0, instance = data[0] & 0x0f;
  if (command === 0xb0 && data[1] === 9) {
    const group = Math.min(6, Math.max(1, data[2] ?? 1));
    return [[0xc0 | port, group - 1, 0], ...bendRange(port, GROUP_BEND_RANGE[group])].map((d) => ({ instance, data: d }));
  }
  return [{ instance, data: [command | port, data[1] ?? 0, data[2] ?? 0] }];
}

/**
 * Messages qui préparent une instance : sur le canal de chaque port, la banque de l'instrument du
 * multi (0 à 15 pour A1 à A16, 16 à 31 pour B1 à B16), le groupe P1 et son étendue de pitch-bend.
 * @param {number} instance Instance (enceinte) de 0 à 15.
 * @returns {Array<Array<number>>}
 */
export function initMessages(instance) {
  return PORTS.flatMap((p) => [[0xb0 | p, 0, p * 16 + instance], [0xc0 | p, 0, 0], ...bendRange(p, GROUP_BEND_RANGE[1])]);
}

/**
 * Gain de sortie (dB) noté par `scripts/soundfont.js` dans le commentaire du SoundFont
 * (`animots-gain-db=…`), 0 pour un autre SoundFont.
 * @param {Uint8Array} bytes Contenu du fichier : seuls les premiers 64 Ko (bloc INFO) sont lus.
 * @returns {number}
 */
export function soundFontGain(bytes) {
  const head = new TextDecoder('latin1').decode(bytes.subarray(0, 64 * 1024));
  const m = /animots-gain-db=(-?[\d.]+)/.exec(head);
  return m ? Number(m[1]) : 0;
}

/** Volume général de RustySynth par défaut (`Synthesizer::master_volume`). */
const DEFAULT_MASTER_VOLUME = 0.5;

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
    /** Messages de la partition transmis au worklet. */
    this.sent = 0;
    /** @type {Array<number>} Crête de chaque instance sur le dernier dixième de seconde, renvoyée par le worklet. */
    this.peaks = new Array(INSTANCES).fill(0);
    /** Crête la plus forte relevée depuis la création de la sortie. */
    this.maxLevel = 0;
    /** Heure `performance.now()` du dernier relevé de niveaux : le worklet en envoie dix par seconde. */
    this.lastLevels = performance.now();
  }

  /**
   * Le rendu audio est-il bloqué ? Le worklet envoie un relevé de niveaux environ dix fois par
   * seconde tant que le contexte audio tourne ; sans relevé depuis `limite`, le rendu est figé
   * (carte son disparue, fil audio arrêté), même si la partition continue d'être envoyée.
   * @param {number} [now] Heure `performance.now()`.
   * @param {number} [limite=15000] Silence admis (ms).
   * @returns {boolean}
   */
  stalled(now = performance.now(), limite = 15000) { return now - this.lastLevels > limite; }

  /**
   * Crête la plus forte des 16 instances (0 : silence), d'après le dernier relevé du worklet.
   * @returns {number}
   */
  level() { return Math.max(...this.peaks); }

  /**
   * Reçoit un relevé de niveaux du worklet (environ dix par seconde).
   * @param {ArrayLike<number>} peaks Crête de chaque instance.
   * @returns {void}
   */
  setPeaks(peaks) {
    this.lastLevels = performance.now();
    this.peaks = Array.from(peaks);
    this.maxLevel = Math.max(this.maxLevel, this.level());
  }

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
   * @returns {Promise<{sink: RustySynthSink, presets: number, separees: boolean, max: number, gainDb: number}>}
   */
  static async create(ctx, { sf2, wasm, processorUrl, AudioWorkletNode: Node = globalThis.AudioWorkletNode, blockSize = 32, polyphony = 64 }) {
    const gainDb = soundFontGain(new Uint8Array(sf2)); // avant le transfert, qui vide le tampon
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
    node.port.onmessage = (e) => { if (e.data.type === 'levels') sink.setPeaks(e.data.peaks); };
    node.port.postMessage({ type: 'volume', value: DEFAULT_MASTER_VOLUME * 10 ** (gainDb / 20) });
    for (let i = 0; i < INSTANCES; i++) {
      for (const data of initMessages(i)) node.port.postMessage({ type: 'midi', time: 0, instance: i, data });
    }
    return { sink, presets, separees, max, gainDb };
  }

  /**
   * Envoie un message de la partition à son heure.
   * @param {number} port
   * @param {Array<number>} data
   * @param {number} time Heure sur l'horloge `performance.now()` (ms).
   * @returns {void}
   */
  send(port, data, time) {
    const out = route(port, data);
    if (!out.length) { this.dropped++; return; }
    this.sent++;
    const t = this.toAudioTime(time);
    for (const r of out) this.node.port.postMessage({ type: 'midi', time: t, instance: r.instance, data: r.data });
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
  let ts = null;
  // node-web-audio-api déclare getOutputTimestamp, mais lève « not yet implemented »
  try { ts = ctx.getOutputTimestamp?.() ?? null; } catch { ts = null; }
  if (ts && ts.performanceTime > 0) return (ts.contextTime ?? 0) + (ms - ts.performanceTime) / 1000;
  return ctx.currentTime + (ms - now()) / 1000;
}

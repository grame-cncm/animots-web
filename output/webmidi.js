/**
 * @file Sortie Web MIDI : relie les ports de la partition (A, B) à des sorties MIDI du système.
 *
 * Sous macOS, on crée deux bus du pilote IAC (Configuration audio et MIDI), par exemple
 * « Animots A » et « Animots B ». On les relie ici aux ports A et B, et dans Kontakt 8 en mode
 * autonome (Options, onglet MIDI) à ses ports A et B.
 *
 * Le Web MIDI demande une autorisation à l'utilisateur, et n'existe que dans Chrome, Edge et
 * Firefox (bureau), sur une page servie en `https://` ou `http://localhost`. `MIDIOutput.send`
 * accepte une heure future sur l'horloge `performance.now()` : c'est ce qui permet la lecture
 * anticipée de `output/player.js`.
 */

/**
 * Sortie disponible.
 * @typedef {object} OutputInfo
 * @property {string} id Identifiant stable de la sortie.
 * @property {string} name Nom affiché (par exemple « Pilote IAC Animots A »).
 */

/** Sortie Web MIDI conforme à l'interface `Sink` de `output/player.js`. */
export class WebMidiSink {
  /**
   * @param {MIDIAccess} access Accès MIDI obtenu par `navigator.requestMIDIAccess()`.
   */
  constructor(access) {
    this.access = access;
    /** @type {Map<number, MIDIOutput>} Sortie reliée à chaque port (0 = A, 1 = B...). */
    this.outputs = new Map();
    /** Messages perdus faute de sortie reliée à leur port (le port C de la séquence 21, par exemple). */
    this.dropped = 0;
  }

  /**
   * Sorties MIDI du système.
   * @returns {Array<OutputInfo>}
   */
  list() {
    return [...this.access.outputs.values()].map((o) => ({ id: o.id, name: o.name ?? o.id }));
  }

  /**
   * Relie un port de la partition à une sortie, ou le délie (`id` vide).
   * @param {number} port 0 (A), 1 (B)...
   * @param {string} id Identifiant de la sortie, ou chaîne vide.
   * @returns {void}
   */
  assign(port, id) {
    const out = id ? this.access.outputs.get(id) : null;
    if (out) this.outputs.set(port, out); else this.outputs.delete(port);
  }

  /**
   * Envoie un message à l'heure donnée.
   * @param {number} port
   * @param {Array<number>} data Octets MIDI.
   * @param {number} time Heure sur l'horloge `performance.now()` (ms).
   * @returns {void}
   */
  send(port, data, time) {
    const out = this.outputs.get(port);
    if (out) out.send(data, time); else this.dropped++;
  }

  /**
   * Ports reliés à une sortie.
   * @returns {Array<number>}
   */
  ports() { return [...this.outputs.keys()]; }

  /**
   * Annule les messages programmés, quand le navigateur le permet.
   * @returns {void}
   */
  clear() {
    for (const out of this.outputs.values()) {
      try { out.clear?.(); } catch { /* clear() non implémenté : l'arrêt coupe le son autrement */ }
    }
  }
}

/**
 * Demande l'accès MIDI et crée la sortie.
 * @returns {Promise<WebMidiSink>}
 * @throws {Error} Avec une explication en français si le Web MIDI est absent ou refusé.
 */
export async function openWebMidi() {
  if (typeof navigator === 'undefined' || !navigator.requestMIDIAccess) {
    throw new Error('Web MIDI indisponible dans ce navigateur : utiliser Chrome ou Edge, sur http://localhost.');
  }
  try {
    return new WebMidiSink(await navigator.requestMIDIAccess({ sysex: false }));
  } catch (e) {
    throw new Error(`accès MIDI refusé ou impossible (${e.message ?? e}) : autoriser le MIDI pour cette page.`);
  }
}

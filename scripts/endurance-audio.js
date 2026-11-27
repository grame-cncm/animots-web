#!/usr/bin/env node
/**
 * @file Endurance audio accélérée : la partition de l'installation, jouée par le vrai lecteur avec
 * une horloge factice, passe par le module RustySynth (output/rustysynth/rustysynth_wasm.wasm),
 * rendu sous Node sans carte son, plus vite que le temps réel. On vérifie le son produit sur des
 * heures simulées.
 *
 *     node scripts/endurance-audio.js [--sf2 FICHIER] [--heures H] [--graine G]
 *
 * Par défaut : `../conversion-multi/gerland.sf2`, 1 heure, graine 2013. Code de sortie 1 si un
 * problème est trouvé. `make endurance-audio` lance la même chose.
 *
 * Le chemin des messages est celui de la sortie RustySynth (`route`, `initMessages`, gain du
 * SoundFont) ; seuls le worklet et la carte son sont remplacés par une boucle de rendu. Problèmes
 * cherchés :
 * - **valeurs invalides** : un échantillon NaN ou infini ;
 * - **mémoire** : la mémoire du module WebAssembly qui grandit pendant le rendu (`rs_midi` et
 *   `rs_render` ne doivent pas allouer) ;
 * - **arrêt** : la boucle des parties qui s'arrête.
 *
 * Rapportés sans être des problèmes : la crête maximale (au-delà de 1, la sortie sature), les
 * échantillons au-delà de 1, et les parties restées muettes alors qu'elles envoient des notes.
 * Une partie muette s'explique souvent par les échantillons introuvables du multi (P4, une
 * partie de P1) ; elle est à écouter, pas forcément une panne.
 */

import { readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { seed, sharedGenerators } from '../core/index.js';
import { gParties, calculPartie } from '../piece/gerland/parties.js';
import { Player } from '../output/player.js';
import { route, initMessages, soundFontGain, INSTANCES } from '../output/rustysynth.js';

/** Fréquence d'échantillonnage du rendu. */
const SR = 48000;
/** Trames rendues par appel, comme un quantum Web Audio. */
const QUANTUM = 128;
/** Battement du lecteur (ms), comme dans l'exécuteur. */
const BATTEMENT = 25;

/**
 * Rapport d'endurance audio.
 * @typedef {object} RapportAudio
 * @property {number} secondes Durée de son rendue (s).
 * @property {number} facteur Durée rendue divisée par le temps de calcul.
 * @property {number} parties Parties commencées.
 * @property {number} messages Messages MIDI passés au module.
 * @property {number} invalides Échantillons NaN ou infinis.
 * @property {number} crete Crête maximale de la sortie.
 * @property {number} satures Échantillons dont la valeur absolue dépasse 1.
 * @property {Array<string>} muettes Parties qui envoient des notes mais restent muettes.
 * @property {number} memoireDebut Mémoire du module après l'initialisation (octets).
 * @property {number} memoireFin Mémoire du module à la fin (octets).
 * @property {Array<string>} problemes Problèmes trouvés (vide si tout va bien).
 */

/**
 * Rend l'installation par RustySynth, sans carte son.
 * @param {object} o
 * @param {Uint8Array} o.sf2 Contenu du SoundFont.
 * @param {number} [o.heures=1] Durée à rendre (heures).
 * @param {number} [o.graine=2013] Graine de l'aléa.
 * @param {Uint8Array} [o.wasm] Module RustySynth (celui de output/rustysynth/ par défaut).
 * @returns {Promise<RapportAudio>}
 */
export async function endurer({ sf2, heures = 1, graine = 2013, wasm = readFileSync(new URL('../output/rustysynth/rustysynth_wasm.wasm', import.meta.url)) }) {
  const { instance } = await WebAssembly.instantiate(wasm, {});
  const ex = instance.exports;
  const erreur = () => new TextDecoder().decode(new Uint8Array(ex.memory.buffer, ex.rs_error_ptr(), ex.rs_error_len()));
  const ptr = ex.rs_sf2_buffer(sf2.length); // peut agrandir la mémoire : lire memory.buffer après
  new Uint8Array(ex.memory.buffer, ptr, sf2.length).set(sf2);
  if (ex.rs_load_soundfont() < 0) throw new Error(erreur());
  if (ex.rs_init(SR, INSTANCES, 32, 64, 0) < 0) throw new Error(erreur());
  ex.rs_set_master_volume(0.5 * 10 ** (soundFontGain(sf2) / 20));
  for (let i = 0; i < INSTANCES; i++) for (const d of initMessages(i)) ex.rs_midi(i, d[0], d[1], d[2]);

  const r = {
    secondes: 0, facteur: 0, parties: 0, messages: 0, invalides: 0, crete: 0, satures: 0, muettes: [],
    memoireDebut: ex.memory.buffer.byteLength, memoireFin: 0, problemes: [],
  };
  /** @type {Array<{frame: number, instance: number, data: Array<number>}>} file triée par trame */
  const file = [];
  let arret = false;
  /** Partie en cours, pour repérer une partie muette. */
  let partie = null;
  const finPartie = () => {
    if (partie && partie.notes > 0 && partie.crete === 0) r.muettes.push(`${partie.label} (${partie.notes} notes, à ${(partie.debut / 1000).toFixed(0)} s)`);
  };
  const clock = { t: 0 };
  const sink = {
    send(port, data, time) {
      for (const m of route(port, data)) {
        const frame = Math.max(0, Math.round((time / 1000) * SR));
        let k = file.length;
        while (k > 0 && file[k - 1].frame > frame) k--;
        file.splice(k, 0, { frame, instance: m.instance, data: m.data });
      }
    },
    ports: () => [0, 1],
    clear() { file.length = 0; },
  };
  seed(graine);
  sharedGenerators.reset();
  const gp = gParties();
  const player = new Player({
    sink,
    now: () => clock.t,
    onState: (s) => { if (s === 'arrêt') arret = true; },
    onPart(score, start) {
      finPartie();
      const notes = score.messages().filter((m) => m.kind === 'noteon' && m.data[2] > 0).length;
      partie = { label: score.label, debut: start, notes, crete: 0 };
      r.parties++;
    },
  });
  player.startLoop(() => calculPartie(gp));

  const total = Math.round(heures * 3600 * SR);
  const t0 = performance.now();
  let prochainBattement = 0;
  for (let frame = 0; frame < total && !arret; frame += QUANTUM) {
    clock.t = (frame / SR) * 1000;
    if (clock.t >= prochainBattement) { player.tick(); prochainBattement += BATTEMENT; }
    while (file.length && file[0].frame <= frame) {
      const m = file.shift();
      ex.rs_midi(m.instance, m.data[0], m.data[1], m.data[2]);
      r.messages++;
    }
    const buf = new Float32Array(ex.memory.buffer, ex.rs_render(QUANTUM), INSTANCES * 2 * QUANTUM);
    let crete = 0;
    for (let k = 0; k < buf.length; k++) {
      const v = buf[k];
      if (!Number.isFinite(v)) { r.invalides++; continue; }
      const a = Math.abs(v);
      if (a > crete) crete = a;
      if (a > 1) r.satures++;
    }
    if (crete > r.crete) r.crete = crete;
    if (partie && crete > partie.crete) partie.crete = crete;
  }
  finPartie();
  const arretPendantLeRendu = arret; // l'arrêt final ci-dessous n'en est pas un
  player.stop();
  r.secondes = total / SR;
  r.facteur = r.secondes / ((performance.now() - t0) / 1000);
  r.memoireFin = ex.memory.buffer.byteLength;
  if (r.invalides) r.problemes.push(`${r.invalides} échantillons NaN ou infinis`);
  if (r.memoireFin !== r.memoireDebut) r.problemes.push(`mémoire du module : ${r.memoireDebut} -> ${r.memoireFin} octets pendant le rendu`);
  if (arretPendantLeRendu) r.problemes.push('la boucle des parties s’est arrêtée');
  return r;
}

/**
 * Texte du rapport, pour la console.
 * @param {RapportAudio} r
 * @returns {string}
 */
export function formatRapportAudio(r) {
  const lignes = [
    `${(r.secondes / 3600).toFixed(2)} h de son rendues, ${r.facteur.toFixed(0)} fois plus vite que le temps réel ; ${r.parties} parties, ${r.messages} messages`,
    `crête maximale ${r.crete.toFixed(3)} ; échantillons au-delà de 1 : ${r.satures} ; NaN ou infinis : ${r.invalides}`,
    `mémoire du module : ${(r.memoireDebut / 1e6).toFixed(1)} Mo -> ${(r.memoireFin / 1e6).toFixed(1)} Mo`,
    r.muettes.length ? `parties muettes malgré des notes (${r.muettes.length}, à écouter) : ${r.muettes.slice(0, 10).join(' ; ')}` : 'aucune partie muette',
    r.problemes.length ? `PROBLÈMES : ${r.problemes.join(' ; ')}` : 'aucun problème',
  ];
  return lignes.join('\n');
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  const args = process.argv.slice(2);
  const opt = (nom, defaut) => { const k = args.indexOf(nom); return k >= 0 ? args[k + 1] : defaut; };
  const sf2 = opt('--sf2', fileURLToPath(new URL('../../conversion-multi/gerland.sf2', import.meta.url)));
  try {
    const r = await endurer({ sf2: readFileSync(sf2), heures: Number(opt('--heures', 1)), graine: Number(opt('--graine', 2013)) });
    console.log(formatRapportAudio(r));
    process.exit(r.problemes.length ? 1 : 0);
  } catch (e) {
    console.error(`endurance audio : ${e.message}`);
    process.exit(1);
  }
}

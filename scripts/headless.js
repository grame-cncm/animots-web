#!/usr/bin/env node
/**
 * @file Exécuteur headless : joue l'installation Animots sous Node.js, sans navigateur ni
 * interface. C'est la forme prévue pour l'exploitation continue, relancée par launchd
 * (voir deploy/).
 *
 * Usage :
 *
 *     node scripts/headless.js [options]
 *
 * Options :
 * - `--graine N` : graine de l'aléa (par défaut, tirée au hasard) ;
 * - `--sortie-a NOM`, `--sortie-b NOM` : relie le port A (ou B) à une sortie existante dont le
 *   nom contient NOM (un bus IAC, par exemple). Par défaut, crée les ports virtuels
 *   « Animots A » et « Animots B » ;
 * - `--simule` : aucune sortie MIDI (essai, tests) ;
 * - `--echantillonneur FICHIER.sf2` : joue par l'échantillonneur intégré (RustySynth en
 *   WebAssembly, dans node-web-audio-api) au lieu du MIDI : ni Kontakt ni bus IAC. Le SoundFont
 *   est celui que fabrique `scripts/soundfont.js`. Une instance par enceinte, une voie de la carte
 *   par instance si la carte en a 16, sinon un repli en stéréo (signalé dans le journal) ;
 * - `--carte NOM` : avec l'échantillonneur, la carte son dont le nom contient NOM (la sortie par
 *   défaut du système sinon) ;
 * - `--muet` : avec l'échantillonneur, aucune sortie audio ; le rendu tourne quand même (essais) ;
 * - `--cartes` : affiche les sorties audio du système et s'arrête ;
 * - `--essai NOM` : joue un essai (cercle1, cercle2, tutti, alterne, essai, essai1bis) puis s'arrête ;
 * - `--duree S` : s'arrête après S secondes ;
 * - `--journal FICHIER` : ajoute à ce fichier une ligne par partie (date, numéro, séquence,
 *   durée, état de l'aléa), comme le fichier `animots-session` de 2013 ;
 * - `--battement FICHIER` : réécrit ce fichier toutes les 10 secondes, tant que la boucle tourne ;
 *   le chien de garde (deploy/watchdog.sh) relance l'exécuteur s'il n'est plus réécrit ;
 * - `--eveille` : empêche la mise en veille de la machine tant que l'exécuteur tourne (macOS,
 *   `caffeinate`) ;
 * - `--mesures MIN` : écrit toutes les MIN minutes (10 par défaut, 0 pour aucune) une ligne de
 *   mesures : mémoire, parties jouées, notes actives, retard maximal des messages MIDI depuis la
 *   mesure précédente. `scripts/rapport.js` en tire les tendances d'un long essai ;
 * - `--liste` : affiche les sorties MIDI du système et s'arrête.
 *
 * Arrêt propre sur SIGINT (Ctrl-C) ou SIGTERM (launchd) : coupe le son (note-off, CC123, CC120),
 * attend l'envoi des derniers messages, ferme les ports (ou le contexte audio).
 */

import { appendFileSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { realpathSync } from 'node:fs';
import { seed, getRandomState, sharedGenerators, Score } from '../core/index.js';
import { gParties, calculPartie } from '../piece/gerland/parties.js';
import { ESSAIS } from '../piece/gerland/sequences/index.js';
import { Player } from '../output/player.js';
import { ScheduledSink, openNodeMidi, listOutputs } from '../output/node-midi.js';
import { openRustySynthNode, listAudioOutputs } from '../output/rustysynth-node.js';

/**
 * Lit les options de la ligne de commande (voir l'en-tête du fichier).
 * @param {Array<string>} argv Arguments après le nom du script.
 * @returns {{graine: number|null, sortieA: string|null, sortieB: string|null, simule: boolean, essai: string|null, duree: number|null, journal: string|null, battement: string|null, eveille: boolean, liste: boolean, echantillonneur: string|null, carte: string|null, muet: boolean, cartes: boolean, mesures: number}}
 *   `echantillonneur` : chemin du SoundFont ; `carte` : partie du nom de la carte son ; `muet` :
 *   échantillonneur sans sortie audio ; `cartes` : lister les sorties audio ; `mesures` :
 *   période des lignes de mesures, en minutes (0 : aucune).
 * @throws {Error} Sur une option inconnue, une valeur manquante ou des options incompatibles
 *   (`--simule` avec `--echantillonneur` ; `--carte` ou `--muet` sans `--echantillonneur`).
 */
export function parseArgs(argv) {
  const o = {
    graine: null, sortieA: null, sortieB: null, simule: false, essai: null, duree: null, journal: null, battement: null, eveille: false, liste: false,
    echantillonneur: null, carte: null, muet: false, cartes: false, mesures: 10,
  };
  const value = (k) => { if (argv[k + 1] === undefined) throw new Error(`valeur manquante après ${argv[k]}`); return argv[k + 1]; };
  for (let k = 0; k < argv.length; k++) {
    switch (argv[k]) {
      case '--graine': o.graine = Number(value(k)) >>> 0; k++; break;
      case '--sortie-a': o.sortieA = value(k); k++; break;
      case '--sortie-b': o.sortieB = value(k); k++; break;
      case '--simule': o.simule = true; break;
      case '--essai': o.essai = value(k); k++; break;
      case '--duree': o.duree = Number(value(k)); k++; break;
      case '--journal': o.journal = value(k); k++; break;
      case '--battement': o.battement = value(k); k++; break;
      case '--eveille': o.eveille = true; break;
      case '--liste': o.liste = true; break;
      case '--echantillonneur': o.echantillonneur = value(k); k++; break;
      case '--carte': o.carte = value(k); k++; break;
      case '--muet': o.muet = true; break;
      case '--cartes': o.cartes = true; break;
      case '--mesures': o.mesures = Number(value(k)); k++; break;
      default: throw new Error(`option inconnue : ${argv[k]}`);
    }
  }
  if (o.essai && !ESSAIS[o.essai]) throw new Error(`essai inconnu : ${o.essai} (${Object.keys(ESSAIS).join(', ')})`);
  if (o.simule && o.echantillonneur) throw new Error('--simule et --echantillonneur s’excluent (pour un essai sans son : --echantillonneur … --muet)');
  if ((o.carte || o.muet) && !o.echantillonneur) throw new Error('--carte et --muet ne valent qu’avec --echantillonneur');
  if (o.carte && o.muet) throw new Error('--carte et --muet s’excluent');
  if (!(o.mesures >= 0)) throw new Error('--mesures attend un nombre de minutes (0 pour aucune)');
  return o;
}

/**
 * Durée en minutes et secondes.
 * @param {number} ms
 * @returns {string}
 */
const mmss = (ms) => { const s = Math.round(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

/**
 * Ligne de mesures du journal (option `--mesures`).
 * @param {object} m
 * @param {number} m.parties Parties commencées depuis le démarrage.
 * @param {number} m.depuis Durée depuis le démarrage (ms).
 * @param {number} m.notesActives Notes actives dans le lecteur.
 * @param {number|null} m.retard Retard maximal des messages MIDI depuis la mesure précédente (ms),
 *   ou null pour une sortie qui ne le mesure pas.
 * @param {NodeJS.MemoryUsage} [m.memoire] Mémoire du processus (process.memoryUsage() par défaut).
 * @returns {string}
 */
export function ligneMesures({ parties, depuis, notesActives, retard, memoire = process.memoryUsage() }) {
  const mo = (n) => (n / 1048576).toFixed(1);
  const heures = (depuis / 3600000).toFixed(2);
  return `mesures : mémoire ${mo(memoire.rss)} Mo (tas ${mo(memoire.heapUsed)} Mo), ${parties} parties calculées en ${heures} h, `
    + `${notesActives} notes actives${retard === null ? '' : `, retard maximal ${retard.toFixed(1)} ms`}`;
}

/**
 * Nombre de démarrages déjà notés dans un journal (lignes « démarrage, graine »). Un démarrage
 * de plus que prévu révèle une relance par launchd ou par le chien de garde.
 * @param {string|null} journal Chemin du journal, ou null.
 * @returns {number}
 */
export function demarragesPrecedents(journal) {
  if (!journal || !existsSync(journal)) return 0;
  return (readFileSync(journal, 'utf8').match(/ {2}démarrage, graine /g) ?? []).length;
}

/**
 * Lance l'exécuteur.
 * @param {ReturnType<typeof parseArgs>} o Options.
 * @returns {Promise<void>} Se résout à l'arrêt.
 */
export async function main(o) {
  if (o.liste) {
    const names = await listOutputs();
    console.log(names.length ? names.map((n) => `  ${n}`).join('\n') : '  (aucune sortie MIDI)');
    return;
  }
  if (o.cartes) {
    const outs = await listAudioOutputs();
    console.log(outs.length ? outs.map((d) => `  ${d.label}`).join('\n') : '  (aucune sortie audio)');
    return;
  }

  /**
   * Écrit une ligne sur la console et dans le journal.
   * @param {string} text
   * @returns {void}
   */
  const log = (text) => {
    const line = `${new Date().toISOString()}  ${text}`;
    console.log(line);
    if (o.journal) appendFileSync(o.journal, `${line}\n`);
  };

  let sink;
  if (o.echantillonneur) {
    sink = await openRustySynthNode({ soundFont: o.echantillonneur, carte: o.carte, muet: o.muet });
    log(`échantillonneur : ${o.echantillonneur} (${sink.presets} presets, gain ${sink.gainDb} dB), carte : ${sink.carte}`);
    if (sink.separees) log(`16 voies séparées, une par enceinte (la carte en a ${sink.max})`);
    else log(`ATTENTION : la carte n'a que ${sink.max} voies, les 16 enceintes sont repliées en stéréo (impaires à gauche, paires à droite)`);
  } else if (o.simule) {
    sink = Object.assign(new ScheduledSink({ sendNow: () => {}, ports: () => [0, 1] }), { names: ['simulé', 'simulé'], close() { this.stopTimer(); } });
    sink.start();
  } else {
    sink = await openNodeMidi({ targets: [o.sortieA, o.sortieB] });
  }
  if (!o.echantillonneur) log(`sorties : port A -> ${sink.names[0]}, port B -> ${sink.names[1]}`);
  if (o.eveille) {
    // caffeinate s'arrête de lui-même quand ce processus se termine (-w)
    spawn('caffeinate', ['-dimsu', '-w', String(process.pid)], { stdio: 'ignore', detached: true }).unref();
    log('mise en veille empêchée (caffeinate)');
  }

  let partNo = 0;
  let partStarted = false;
  let notesPrecedentes = 0;
  const debut = Date.now();
  /** Retard maximal sur toute la session (la sortie MIDI remet le sien à zéro à chaque mesure). */
  let retardMax = 0;
  let stopping = false;
  let resolveDone;
  const done = new Promise((r) => { resolveDone = r; });
  const player = new Player({
    sink,
    onPart(score) {
      // échantillonneur : crête de la partie qui finit, pour repérer une partie restée muette
      if (typeof sink.maxLevel === 'number' && partStarted) {
        log(`  crête de la partie précédente : ${sink.maxLevel.toFixed(4)}`);
        if (sink.maxLevel === 0 && notesPrecedentes > 0) log(`  ATTENTION : la partie précédente est restée muette malgré ${notesPrecedentes} notes`);
      }
      if (typeof sink.maxLevel === 'number') { sink.maxLevel = 0; partStarted = true; }
      notesPrecedentes = score.messages().filter((m) => m.kind === 'noteon' && m.data[2] > 0).length;
      const meta = score.meta ?? {};
      log(`${meta.no ? `partie ${meta.no} : ` : ''}${score.label}, ${mmss(score.seconds(score.end) * 1000)}`
        + `${meta.state !== undefined ? `, aléa ${meta.state.toString(16)}` : ''}`
        + `${score.warnings.length ? `, ${score.warnings.length} anomalie(s)` : ''}`);
    },
    onState(state) { if (state === 'arrêt' && !stopping) shutdown('fin'); },
  });
  const ticker = setInterval(() => player.tick(), 25);
  const heart = o.battement ? setInterval(() => writeFileSync(o.battement, `${new Date().toISOString()}\n`), 10000) : null;
  if (o.battement) writeFileSync(o.battement, `${new Date().toISOString()}\n`);
  const mesures = o.mesures > 0 ? setInterval(() => {
    const retard = typeof sink.maxLate === 'number' ? sink.maxLate : null;
    log(ligneMesures({ parties: partNo, depuis: Date.now() - debut, notesActives: player.active.size, retard }));
    if (retard !== null) { retardMax = Math.max(retardMax, retard); sink.maxLate = 0; }
  }, o.mesures * 60000) : null;

  /**
   * Arrête proprement : coupe le son, laisse partir les derniers messages, ferme les ports.
   * @param {string} why Raison, pour le journal.
   * @returns {void}
   */
  function shutdown(why) {
    if (stopping) return;
    stopping = true;
    player.stop();
    clearInterval(ticker);
    if (heart) clearInterval(heart);
    if (mesures) clearInterval(mesures);
    setTimeout(async () => {
      await sink.close();
      const detail = [
        `${sink.sent} messages envoyés`,
        ...(typeof sink.maxLate === 'number' ? [`retard maximal ${Math.max(retardMax, sink.maxLate).toFixed(1)} ms`] : []),
        ...(typeof sink.maxLevel === 'number' ? [`crête de la dernière partie ${sink.maxLevel.toFixed(4)}`] : []),
      ];
      log(`arrêt (${why}) ; ${detail.join(', ')}`);
      resolveDone();
    }, player.lookahead + 100);
  }
  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  if (o.duree) setTimeout(() => shutdown(`durée de ${o.duree} s atteinte`), o.duree * 1000);

  if (o.essai) {
    const score = new Score();
    sharedGenerators.reset();
    ESSAIS[o.essai](score);
    log(`essai ${o.essai}`);
    player.playOnce(score);
  } else {
    const graine = o.graine ?? (Math.random() * 2 ** 32) >>> 0;
    seed(graine);
    sharedGenerators.reset();
    const parties = gParties();
    const n = demarragesPrecedents(o.journal) + 1;
    log(`démarrage, graine ${graine}${n > 1 ? ` (démarrage n° ${n} de ce journal)` : ''}`);
    player.startLoop(() => {
      const state = getRandomState();
      const score = calculPartie(parties);
      score.meta = { no: ++partNo, state };
      return score;
    });
  }
  return done;
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  try {
    await main(parseArgs(process.argv.slice(2)));
    process.exit(0);
  } catch (e) {
    console.error(`animots : ${e.message}`);
    process.exit(1);
  }
}

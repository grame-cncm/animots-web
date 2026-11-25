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
 * - `--essai NOM` : joue un essai (cercle1, cercle2, tutti, alterne, essai, essai1bis) puis s'arrête ;
 * - `--duree S` : s'arrête après S secondes ;
 * - `--journal FICHIER` : ajoute à ce fichier une ligne par partie (date, numéro, séquence,
 *   durée, état de l'aléa), comme le fichier `animots-session` de 2013 ;
 * - `--battement FICHIER` : réécrit ce fichier toutes les 10 secondes, tant que la boucle tourne ;
 *   le chien de garde (deploy/watchdog.sh) relance l'exécuteur s'il n'est plus réécrit ;
 * - `--eveille` : empêche la mise en veille de la machine tant que l'exécuteur tourne (macOS,
 *   `caffeinate`) ;
 * - `--liste` : affiche les sorties MIDI du système et s'arrête.
 *
 * Arrêt propre sur SIGINT (Ctrl-C) ou SIGTERM (launchd) : coupe le son (note-off, CC123, CC120),
 * attend l'envoi des derniers messages, ferme les ports.
 */

import { appendFileSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { realpathSync } from 'node:fs';
import { seed, getRandomState, sharedGenerators, Score } from '../core/index.js';
import { gParties, calculPartie } from '../piece/gerland/parties.js';
import { ESSAIS } from '../piece/gerland/sequences/index.js';
import { Player } from '../output/player.js';
import { ScheduledSink, openNodeMidi, listOutputs } from '../output/node-midi.js';

/**
 * Lit les options de la ligne de commande.
 * @param {Array<string>} argv Arguments après le nom du script.
 * @returns {{graine: number|null, sortieA: string|null, sortieB: string|null, simule: boolean, essai: string|null, duree: number|null, journal: string|null, battement: string|null, eveille: boolean, liste: boolean}}
 * @throws {Error} Sur une option inconnue ou une valeur manquante.
 */
export function parseArgs(argv) {
  const o = { graine: null, sortieA: null, sortieB: null, simule: false, essai: null, duree: null, journal: null, battement: null, eveille: false, liste: false };
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
      default: throw new Error(`option inconnue : ${argv[k]}`);
    }
  }
  if (o.essai && !ESSAIS[o.essai]) throw new Error(`essai inconnu : ${o.essai} (${Object.keys(ESSAIS).join(', ')})`);
  return o;
}

/**
 * Durée en minutes et secondes.
 * @param {number} ms
 * @returns {string}
 */
const mmss = (ms) => { const s = Math.round(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

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

  const sink = o.simule
    ? Object.assign(new ScheduledSink({ sendNow: () => {}, ports: () => [0, 1] }), { names: ['simulé', 'simulé'], close() { this.stopTimer(); } })
    : await openNodeMidi({ targets: [o.sortieA, o.sortieB] });
  if (o.simule) sink.start();
  log(`sorties : port A -> ${sink.names[0]}, port B -> ${sink.names[1]}`);
  if (o.eveille) {
    // caffeinate s'arrête de lui-même quand ce processus se termine (-w)
    spawn('caffeinate', ['-dimsu', '-w', String(process.pid)], { stdio: 'ignore', detached: true }).unref();
    log('mise en veille empêchée (caffeinate)');
  }

  let partNo = 0;
  let stopping = false;
  let resolveDone;
  const done = new Promise((r) => { resolveDone = r; });
  const player = new Player({
    sink,
    onPart(score) {
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
    setTimeout(() => {
      sink.close();
      log(`arrêt (${why}) ; ${sink.sent} messages envoyés, retard maximal ${sink.maxLate.toFixed(1)} ms`);
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
    log(`démarrage, graine ${graine}`);
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

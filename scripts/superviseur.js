#!/usr/bin/env node
/**
 * @file Superviseur : essaie la version web (Chrome en kiosque), et bascule sur l'exécuteur
 * headless si la page ne joue pas.
 *
 * 1. Lance Chrome en kiosque sur la version figée, avec le profil dédié de deploy/web-kiosk.sh
 *    (autorisation MIDI et choix des ports gardés) et un port de débogage local.
 * 2. Toutes les `--intervalle` secondes, lit le diagnostic de la page (`window.animotsDiagnostic`)
 *    par le protocole DevTools. La page n'envoie rien elle-même : pas de requête d'un site public
 *    vers le réseau local, que Chrome restreint.
 * 3. La page joue si la boucle des parties tourne, si les ports A et B sont reliés à de vraies
 *    sorties MIDI (sinon la lecture est simulée, donc muette) et si l'ordonnanceur bat encore.
 * 4. Si elle ne joue pas au bout de `--delai-demarrage` secondes, ou si `--echecs` contrôles de
 *    suite échouent plus tard, ou si Chrome s'arrête, le superviseur ferme Chrome, attend qu'il
 *    soit fermé, puis lance l'exécuteur headless (scripts/headless.js). Les deux ne jouent jamais
 *    ensemble. Il n'y a pas de retour au web pendant la session : la tentative web suivante a lieu
 *    au prochain lancement (launchd relance le superviseur si l'exécuteur s'arrête).
 *
 * Le superviseur journalise ses décisions (`--journal`). Il réécrit le fichier de battement
 * (`--battement`) dès son démarrage puis à chaque contrôle : le battement dit que le
 * superviseur est vivant, la santé de la page étant son affaire à lui. Un battement de la
 * session précédente ne fait donc pas relancer le superviseur pendant sa minute d'essai. En mode
 * headless, c'est l'exécuteur qui réécrit le battement. Le chien de garde (deploy/watchdog.sh)
 * relance le tout si le battement s'arrête.
 *
 * Usage :
 *
 *     node scripts/superviseur.js [options]
 *
 * - `--url URL` : page à ouvrir (par défaut la version figée v1.4, `?demarrer`) ;
 * - `--sortie-a NOM`, `--sortie-b NOM` : sorties de l'exécuteur headless en cas de bascule ;
 *   donner les mêmes que dans la page (les bus IAC), pour que Kontakt reçoive au même endroit ;
 * - `--journal FICHIER`, `--battement FICHIER`, `--eveille` : comme scripts/headless.js ;
 * - `--delai-demarrage S` (60), `--intervalle S` (10), `--echecs N` (3) ;
 * - `--chrome CHEMIN`, `--profil DOSSIER`, `--port-debogage N` (9333) ;
 * - essais : `--sans-fenetre` (Chrome headless), `--accepter-simule` (une page en lecture
 *   simulée compte comme une page qui joue), `--simule-headless` (exécuteur sans MIDI),
 *   `--duree S` (tout arrêter après S secondes).
 */

import { spawn, spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, realpathSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HEADLESS = fileURLToPath(new URL('./headless.js', import.meta.url));

/** Valeurs par défaut des options. */
export const DEFAULTS = Object.freeze({
  url: 'https://grame-cncm.github.io/animots-web/v1.4/ui/?demarrer',
  chrome: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  profil: join(homedir(), 'Library/Application Support/Animots/Chrome'),
  portDebogage: 9333,
  delaiDemarrage: 60,
  intervalle: 10,
  echecs: 3,
});

/**
 * Options du superviseur.
 * @typedef {object} Options
 * @property {string} url
 * @property {string} chrome
 * @property {string} profil
 * @property {number} portDebogage
 * @property {number} delaiDemarrage Secondes accordées à la page pour commencer à jouer.
 * @property {number} intervalle Secondes entre deux contrôles.
 * @property {number} echecs Contrôles en échec de suite avant la bascule.
 * @property {string|null} sortieA
 * @property {string|null} sortieB
 * @property {string|null} journal
 * @property {string|null} battement
 * @property {boolean} eveille
 * @property {boolean} sansFenetre
 * @property {boolean} accepterSimule
 * @property {boolean} simuleHeadless
 * @property {number|null} duree
 */

/**
 * Lit les options de la ligne de commande.
 * @param {Array<string>} argv Arguments après le nom du script.
 * @returns {Options}
 * @throws {Error} Sur une option inconnue ou une valeur manquante.
 */
export function parseArgs(argv) {
  const o = { ...DEFAULTS, sortieA: null, sortieB: null, journal: null, battement: null, eveille: false, sansFenetre: false, accepterSimule: false, simuleHeadless: false, duree: null };
  const value = (k) => { if (argv[k + 1] === undefined) throw new Error(`valeur manquante après ${argv[k]}`); return argv[k + 1]; };
  const nums = { '--delai-demarrage': 'delaiDemarrage', '--intervalle': 'intervalle', '--echecs': 'echecs', '--port-debogage': 'portDebogage', '--duree': 'duree' };
  const strs = { '--url': 'url', '--chrome': 'chrome', '--profil': 'profil', '--sortie-a': 'sortieA', '--sortie-b': 'sortieB', '--journal': 'journal', '--battement': 'battement' };
  const flags = { '--eveille': 'eveille', '--sans-fenetre': 'sansFenetre', '--accepter-simule': 'accepterSimule', '--simule-headless': 'simuleHeadless' };
  for (let k = 0; k < argv.length; k++) {
    const a = argv[k];
    if (nums[a]) { o[nums[a]] = Number(value(k)); k++; } else if (strs[a]) { o[strs[a]] = value(k); k++; } else if (flags[a]) o[flags[a]] = true;
    else throw new Error(`option inconnue : ${a}`);
  }
  return o;
}

/**
 * Diagnostic rendu par `window.animotsDiagnostic()` dans la page (ui/app.js).
 * @typedef {object} Diagnostic
 * @property {string} etat 'arrêt', 'boucle' ou 'unique'.
 * @property {number} envoyes Messages MIDI envoyés depuis le chargement.
 * @property {Array<number>} sortiesMidi Ports reliés à une sortie MIDI réelle.
 * @property {boolean} webMidi Accès Web MIDI obtenu.
 * @property {number} battementMs Temps depuis le dernier battement de l'ordonnanceur.
 * @property {string|null} sequence Partie qui sonne.
 * @property {string} version Version jouée.
 */

/**
 * Juge si la page joue.
 * @param {Diagnostic|null} diag Diagnostic, ou null si la page n'en donne pas.
 * @param {{accepterSimule?: boolean}} [o]
 * @returns {{ok: boolean, raison: string}}
 */
export function evaluateHealth(diag, { accepterSimule = false } = {}) {
  if (!diag) return { ok: false, raison: 'page sans diagnostic (pas chargée, ou version trop ancienne)' };
  if (diag.etat !== 'boucle') return { ok: false, raison: `boucle des parties arrêtée (état « ${diag.etat} »)` };
  if (!accepterSimule && !diag.webMidi) return { ok: false, raison: 'Web MIDI refusé ou indisponible : lecture simulée, muette' };
  if (!accepterSimule && !(diag.sortiesMidi.includes(0) && diag.sortiesMidi.includes(1))) {
    return { ok: false, raison: 'ports A et B non reliés à des sorties MIDI : lecture simulée, muette' };
  }
  if (diag.battementMs > 5000) return { ok: false, raison: `ordonnanceur arrêté (dernier battement il y a ${Math.round(diag.battementMs / 1000)} s)` };
  return { ok: true, raison: '' };
}

/**
 * Attend un délai.
 * @param {number} ms
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Lit le diagnostic de la page par le protocole DevTools de Chrome.
 * @param {number} port Port de débogage.
 * @param {number} [timeoutMs=5000] Délai au-delà duquel la page est jugée bloquée.
 * @returns {Promise<Diagnostic|null>} Diagnostic, ou null si la page n'expose pas de diagnostic.
 * @throws {Error} Si Chrome ou la page ne répondent pas.
 */
export async function pageDiagnostic(port, timeoutMs = 5000) {
  const list = await (await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(timeoutMs) })).json();
  const page = list.find((t) => t.type === 'page' && t.url.includes('/ui/'));
  if (!page) throw new Error('aucun onglet ne montre le lecteur');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  try {
    return await Promise.race([
      new Promise((resolve, reject) => {
        ws.addEventListener('error', () => reject(new Error('connexion DevTools impossible')));
        ws.addEventListener('message', (e) => {
          const m = JSON.parse(e.data);
          if (m.id === 1) resolve(m.result?.result?.value ?? null);
        });
        ws.addEventListener('open', () => ws.send(JSON.stringify({
          id: 1, method: 'Runtime.evaluate',
          params: { expression: 'window.animotsDiagnostic ? window.animotsDiagnostic() : null', returnByValue: true },
        })));
      }),
      sleep(timeoutMs).then(() => { throw new Error(`la page ne répond pas en ${timeoutMs / 1000} s`); }),
    ]);
  } finally {
    ws.close();
  }
}

/**
 * Lance le superviseur.
 * @param {Options} o
 * @returns {Promise<number>} Code de sortie (celui de l'exécuteur headless après une bascule).
 */
export async function main(o) {
  /**
   * Écrit une ligne sur la console et dans le journal.
   * @param {string} text
   * @returns {void}
   */
  const log = (text) => {
    const line = `${new Date().toISOString()}  superviseur : ${text}`;
    console.log(line);
    if (o.journal) appendFileSync(o.journal, `${line}\n`);
  };
  const beat = () => { if (o.battement) writeFileSync(o.battement, `${new Date().toISOString()}\n`); };

  let stopping = false;
  /** @type {import('node:child_process').ChildProcess | null} */
  let chrome = null, headless = null;
  const start = Date.now();
  const stopAll = (why) => {
    if (stopping) return;
    stopping = true;
    log(`arrêt (${why})`);
    headless?.kill('SIGTERM');
    chrome?.kill('SIGTERM');
  };
  process.once('SIGINT', () => stopAll('SIGINT'));
  process.once('SIGTERM', () => stopAll('SIGTERM'));
  if (o.duree) setTimeout(() => stopAll(`durée de ${o.duree} s atteinte`), o.duree * 1000).unref();
  if (o.eveille) spawn('caffeinate', ['-dimsu', '-w', String(process.pid)], { stdio: 'ignore', detached: true }).unref();

  log(`démarrage ; essai de la version web : ${o.url}`);
  beat();
  let reason = null;
  if (!existsSync(o.chrome)) reason = `Chrome introuvable (${o.chrome})`;
  else {
    mkdirSync(o.profil, { recursive: true });
    // un Chrome resté ouvert sur ce profil (session précédente) intercepterait le lancement
    if (spawnSync('pkill', ['-f', `--user-data-dir=${o.profil}`]).status === 0) { log('Chrome de la session précédente fermé'); await sleep(2000); }
    chrome = spawn(o.chrome, [
      `--user-data-dir=${o.profil}`, `--remote-debugging-port=${o.portDebogage}`,
      '--no-first-run', '--no-default-browser-check',
      '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
      '--disable-features=Translate', '--hide-crash-restore-bubble',
      ...(o.sansFenetre ? ['--headless=new'] : ['--kiosk']), o.url,
    ], { stdio: 'ignore' });
    let chromeExit = null;
    chrome.once('exit', (code, signal) => { chromeExit = signal ?? code; });
    chrome.once('error', (e) => { chromeExit = e.message; });

    let playing = false, fails = 0;
    while (!stopping) {
      await sleep(o.intervalle * 1000);
      if (stopping) break;
      beat();
      if (chromeExit !== null) { reason = `Chrome s'est arrêté (${chromeExit})`; break; }
      let h, diag = null;
      try { diag = await pageDiagnostic(o.portDebogage); h = evaluateHealth(diag, o); } catch (e) { h = { ok: false, raison: `page injoignable : ${e.message}` }; }
      if (h.ok) {
        if (!playing || fails) log(`la page joue (${diag.version} ; ${diag.sequence ?? 'entre deux parties'}${o.accepterSimule && !diag.sortiesMidi.length ? ' ; lecture simulée acceptée' : ''})`);
        playing = true; fails = 0;
        continue;
      }
      if (!playing) {
        const elapsed = (Date.now() - start) / 1000;
        if (elapsed >= o.delaiDemarrage) { reason = `au bout de ${o.delaiDemarrage} s, la page ne joue pas : ${h.raison}`; break; }
        continue;
      }
      fails++;
      log(`contrôle en échec (${fails}/${o.echecs}) : ${h.raison}`);
      if (fails >= o.echecs) { reason = h.raison; break; }
    }
  }
  if (stopping) {
    await waitExit(chrome, 10000);
    return 0;
  }

  log(`bascule sur l'exécuteur headless : ${reason}`);
  if (chrome && chrome.exitCode === null && chrome.signalCode === null) {
    chrome.kill('SIGTERM');
    if (!(await waitExit(chrome, 10000))) { chrome.kill('SIGKILL'); await waitExit(chrome, 5000); }
    log('Chrome fermé');
  }
  const args = [HEADLESS];
  if (o.sortieA) args.push('--sortie-a', o.sortieA);
  if (o.sortieB) args.push('--sortie-b', o.sortieB);
  if (o.journal) args.push('--journal', o.journal);
  if (o.battement) args.push('--battement', o.battement);
  if (o.simuleHeadless) args.push('--simule');
  if (o.duree) args.push('--duree', String(Math.max(1, Math.round(o.duree - (Date.now() - start) / 1000))));
  headless = spawn(process.execPath, args, { stdio: 'inherit' });
  const code = await new Promise((r) => headless.once('exit', (c) => r(c ?? 0)));
  log(`exécuteur headless terminé (code ${code})`);
  return code;
}

/**
 * Attend la fin d'un processus.
 * @param {import('node:child_process').ChildProcess | null} child
 * @param {number} ms Délai maximal.
 * @returns {Promise<boolean>} Vrai si le processus est terminé.
 */
function waitExit(child, ms) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return Promise.resolve(true);
  return Promise.race([new Promise((r) => child.once('exit', () => r(true))), sleep(ms).then(() => false)]);
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  try {
    process.exit(await main(parseArgs(process.argv.slice(2))));
  } catch (e) {
    console.error(`animots superviseur : ${e.message}`);
    process.exit(1);
  }
}

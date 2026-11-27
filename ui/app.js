/**
 * @file Interface du lecteur Animots : remplace la fenêtre CAPI « Animots » de
 * Gerland2013-4.lsp (lignes 131 à 307) et le cycle start-sequence / next-sequence.
 *
 * - Démarrer : boucle des parties (`g-parties`), avec la graine donnée ou une graine aléatoire.
 * - Arrêter : `stop-sequence`, et coupe le son.
 * - Cercle1, Cercle2, Tutti, Alterne : jouent un essai une fois, à la place de ce qui joue.
 * - Ports A et B : sorties MIDI du système (bus IAC vers Kontakt 8), mémorisées par le navigateur.
 *   Sans sortie, la lecture est simulée.
 * - Les 16 enceintes s'allument quand leur canal joue, quelle que soit la sortie.
 * - Le journal note chaque partie avec l'état de l'aléa au moment de son calcul, ce qui permet
 *   de la retrouver (`setRandomState`), comme le fichier `animots-session` de 2013.
 * - `ui/?demarrer` lance la boucle tout seul au chargement (`&graine=N` pour une graine fixe) :
 *   c'est ce qu'utilise le démarrage en kiosque de deploy/install-web.sh.
 * - `&sansmidi` ne demande pas l'accès MIDI : sur un profil Chrome neuf, la demande
 *   d'autorisation bloquerait le démarrage automatique. Sert avec l'échantillonneur intégré
 *   (`&sf2=<adresse>`), par exemple pour `make web-auto`.
 */

import { seed, getRandomState, sharedGenerators, Score } from '../core/index.js';
import { gParties, calculPartie } from '../piece/gerland/parties.js';
import { ESSAIS } from '../piece/gerland/sequences/index.js';
import { Player } from '../output/player.js';
import { openWebMidi } from '../output/webmidi.js';
import { SimulatedSink } from '../output/simulated.js';
import { startTicker } from '../output/ticker.js';
import { toSMF } from '../output/smf.js';
import { RustySynthSink } from '../output/rustysynth.js';
import { ZONE1, ZONE2, ZONE3 } from '../piece/gerland/config.js';

/**
 * Élément de la page par identifiant.
 * @param {string} id
 * @returns {HTMLElement}
 */
const $ = (id) => /** @type {HTMLElement} */ (document.getElementById(id));

/**
 * Lit une préférence mémorisée (peut échouer en navigation privée).
 * @param {string} key
 * @returns {string}
 */
function load(key) {
  try { return localStorage.getItem(`animots.${key}`) ?? ''; } catch { return ''; }
}

/**
 * Mémorise une préférence (sans effet si le stockage est indisponible).
 * @param {string} key
 * @param {string} value
 * @returns {void}
 */
function save(key, value) {
  try { localStorage.setItem(`animots.${key}`, value); } catch { /* stockage indisponible */ }
}

/**
 * Durée en minutes et secondes.
 * @param {number} ms
 * @returns {string}
 */
function mmss(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * Ajoute une ligne au journal (les plus récentes en haut, 300 au plus).
 * @param {string} text
 * @param {boolean} [alerte=false] Ligne à signaler.
 * @returns {void}
 */
function journal(text, alerte = false) {
  const li = document.createElement('li');
  const heure = document.createElement('span');
  heure.className = 'heure';
  heure.textContent = new Date().toLocaleTimeString('fr-FR');
  li.append(heure, document.createTextNode(text));
  if (alerte) li.className = 'alerte';
  const list = $('journal');
  list.prepend(li);
  while (list.children.length > 300) list.lastElementChild?.remove();
}

// ________________________________________________________ sorties

const sim = new SimulatedSink();
/** @type {import('../output/webmidi.js').WebMidiSink | null} */
let midi = null;

/**
 * Sortie de l'ordonnanceur : tout passe par la sortie simulée (pour l'affichage des enceintes)
 * et, si des sorties sont choisies, par le Web MIDI.
 * @type {import('../output/player.js').Sink}
 */
const sink = {
  send(port, data, time) { sim.send(port, data, time); midi?.send(port, data, time); rs?.send(port, data, time); },
  ports() { const p = midi?.ports() ?? []; return p.length ? p : [0, 1]; },
  clear() { midi?.clear(); rs?.clear(); },
};

// ________________________________________________________ échantillonneur intégré (prototype)

/** @type {RustySynthSink | null} Sortie RustySynth, quand l'échantillonneur est prêt. */
let rs = null;
/** @type {AudioContext | null} */
let audio = null;
/** Voies de la carte son au démarrage de l'échantillonneur (pour repérer un changement de carte). */
let voiesCarte = 0;

/** Cache du navigateur qui garde le SoundFont choisi, pour le démarrage automatique. */
const SF2_CACHE = 'animots-soundfont';
const SF2_KEY = 'soundfont.sf2';

/**
 * Montre l'état de l'échantillonneur.
 * @param {string} text
 * @returns {void}
 */
function rsStatus(text) { $('rs-statut').textContent = text; }

/**
 * SoundFont gardé dans le cache du navigateur, ou null.
 * @returns {Promise<{bytes: ArrayBuffer, name: string} | null>}
 */
async function storedSoundFont() {
  try {
    const r = await (await caches.open(SF2_CACHE)).match(SF2_KEY);
    return r ? { bytes: await r.arrayBuffer(), name: r.headers.get('x-nom') ?? SF2_KEY } : null;
  } catch { return null; }
}

/**
 * Garde un SoundFont dans le cache du navigateur.
 * @param {ArrayBuffer} bytes
 * @param {string} name
 * @returns {Promise<void>}
 */
async function storeSoundFont(bytes, name) {
  try {
    const headers = { 'content-type': 'application/octet-stream', 'x-nom': encodeURIComponent(name) };
    await (await caches.open(SF2_CACHE)).put(SF2_KEY, new Response(bytes, { headers }));
  } catch (e) { journal(`SoundFont non gardé dans le cache : ${e.message}`, true); }
}

/**
 * Démarre l'échantillonneur avec le SoundFont gardé (ou ne fait rien s'il n'y en a pas).
 * @returns {Promise<void>}
 */
async function startSampler() {
  stopSampler();
  const sf = await storedSoundFont();
  if (!sf) { rsStatus('Choisir un SoundFont (.sf2).'); return; }
  const name = decodeURIComponent(sf.name);
  rsStatus(`Chargement de ${name}…`);
  try {
    audio = new AudioContext({ latencyHint: 'playback' });
    const wasm = await fetch('../output/rustysynth/rustysynth_wasm.wasm').then((r) => r.arrayBuffer());
    const r = await RustySynthSink.create(audio, { sf2: sf.bytes, wasm, processorUrl: '../output/rustysynth/rustysynth-processor.js' });
    rs = r.sink;
    voiesCarte = r.max;
    // le navigateur peut effacer le cache quand l'espace manque : on lui demande de le garder
    navigator.storage?.persist?.().then((ok) => { if (!ok) journal('le navigateur n’a pas accepté de garder le SoundFont en cache de façon persistante', true); }).catch(() => {});
    const voies = r.separees ? `16 voies séparées (la carte en a ${r.max})` : `carte à ${r.max} voies : les 16 enceintes sont repliées en stéréo`;
    rsStatus(`${name} : ${r.presets} presets, ${audio.sampleRate} Hz, ${voies}.`);
    journal(`échantillonneur prêt : ${name}, ${r.presets} presets, ${voies}`, !r.separees);
    audio.onstatechange = () => showAudioState();
    showAudioState();
  } catch (e) {
    stopSampler();
    rsStatus(`Échantillonneur indisponible : ${e.message}`);
    journal(`échantillonneur indisponible : ${e.message}`, true);
  }
}

/**
 * Arrête l'échantillonneur et libère le contexte audio.
 * @returns {void}
 */
function stopSampler() {
  rs = null;
  audio?.close().catch(() => {});
  audio = null;
}

/**
 * Signale un contexte audio suspendu : le navigateur attend un geste de l'utilisateur.
 * @returns {void}
 */
function showAudioState() {
  if (audio?.state === 'suspended') journal('son suspendu par le navigateur : cliquer dans la page (ou lancer Chrome avec --autoplay-policy=no-user-gesture-required)', true);
}

/**
 * Relance le contexte audio s'il est suspendu (à appeler sur un geste de l'utilisateur).
 * @returns {void}
 */
function resumeAudio() {
  if (audio?.state === 'suspended') audio.resume().catch(() => {});
}
document.addEventListener('pointerdown', resumeAudio, { capture: true });
document.addEventListener('keydown', resumeAudio, { capture: true });


// Robustesse pour une installation qui tourne des jours : toutes les 5 s, un contexte suspendu
// est relancé (réveil de la machine, carte son revenue ; en kiosque, l'autoplay le permet), et un
// rendu figé (plus de relevé de niveaux) redémarre l'échantillonneur.
setInterval(() => {
  if (!audio || audio.state === 'closed') return;
  if (audio.state !== 'running') { audio.resume().catch(() => {}); return; }
  if (rs?.stalled()) {
    journal('le rendu audio ne renvoie plus de niveaux depuis 15 s : redémarrage de l’échantillonneur', true);
    startSampler();
  }
}, 5000);

// Une carte son branchée ou débranchée change le nombre de voies : l'échantillonneur redémarre
// pour router à nouveau ses 16 voies (séparées, ou repliées en stéréo).
navigator.mediaDevices?.addEventListener?.('devicechange', () => {
  if (!audio || !rs) return;
  const voies = audio.destination.maxChannelCount;
  journal(`périphériques audio modifiés : la sortie a maintenant ${voies} voies`);
  if (voies !== voiesCarte) startSampler();
});

$('rs-actif').addEventListener('change', (e) => {
  const on = /** @type {HTMLInputElement} */ (e.target).checked;
  save('rs-actif', on ? '1' : '');
  journal(`échantillonneur intégré : ${on ? 'activé' : 'désactivé'}`);
  if (on) startSampler(); else { stopSampler(); rsStatus('Désactivé.'); }
});

$('rs-sf2').addEventListener('change', async (e) => {
  const file = /** @type {HTMLInputElement} */ (e.target).files?.[0];
  if (!file) return;
  await storeSoundFont(await file.arrayBuffer(), file.name);
  journal(`SoundFont choisi : ${file.name}`);
  if (/** @type {HTMLInputElement} */ ($('rs-actif')).checked) startSampler();
  else rsStatus(`${file.name} gardé. Cocher l'échantillonneur intégré pour l'utiliser.`);
});

/**
 * Prépare l'échantillonneur au chargement : SoundFont donné par `?sf2=<adresse>` (gardé dans le
 * cache), puis démarrage si l'échantillonneur était activé (ou si `?sf2` est donné).
 * @returns {Promise<void>}
 */
async function initSampler() {
  const url = new URLSearchParams(location.search).get('sf2');
  if (url) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`${url} : ${r.status}`);
      await storeSoundFont(await r.arrayBuffer(), url.split('/').pop() ?? url);
      save('rs-actif', '1');
    } catch (e) { journal(`SoundFont ?sf2 introuvable : ${e.message}`, true); }
  }
  const on = load('rs-actif') === '1';
  /** @type {HTMLInputElement} */ ($('rs-actif')).checked = on;
  if (on) await startSampler();
}
const samplerReady = initSampler();

/**
 * Remplit les deux listes de sorties et rétablit les choix mémorisés.
 * @returns {void}
 */
function fillOutputs() {
  const outs = midi?.list() ?? [];
  for (const [port, id] of [[0, 'port-a'], [1, 'port-b']]) {
    const sel = /** @type {HTMLSelectElement} */ ($(id));
    const wanted = sel.value || load(id);
    sel.replaceChildren(new Option('— simulée (aucun son) —', ''), ...outs.map((o) => new Option(o.name, o.id)));
    sel.value = outs.some((o) => o.id === wanted) ? wanted : '';
    midi?.assign(port, sel.value);
  }
  $('midi-statut').textContent = midi
    ? `${outs.length} sortie(s) MIDI. Relier le port A au bus « Animots A » et le port B au bus « Animots B ».`
    : $('midi-statut').textContent;
}

for (const [port, id] of [[0, 'port-a'], [1, 'port-b']]) {
  $(id).addEventListener('change', (e) => {
    const value = /** @type {HTMLSelectElement} */ (e.target).value;
    save(id, value);
    midi?.assign(port, value);
    journal(`port ${'AB'[port]} : ${value ? /** @type {HTMLSelectElement} */ (e.target).selectedOptions[0].text : 'simulé'}`);
  });
}

/** Accès MIDI établi (ou refusé, ou pas demandé) : le démarrage automatique attend ce moment. */
const midiReady = (new URLSearchParams(location.search).has('sansmidi')
  ? Promise.reject(new Error('Accès MIDI non demandé (?sansmidi) : seul l’échantillonneur intégré sonne.'))
  : openWebMidi())
  .then((m) => {
    midi = m;
    fillOutputs();
    m.access.onstatechange = () => fillOutputs();
  })
  .catch((e) => {
    $('midi-statut').textContent = e.message;
    fillOutputs();
  });

// ________________________________________________________ lecture

let partNo = 0;

const player = new Player({
  sink,
  onPart(score) {
    const meta = /** @type {{no?: number, state?: number}} */ (score.meta ?? {});
    const extra = score.warnings.length ? ` — ${score.warnings.length} anomalie(s)` : '';
    journal(`${meta.no ? `partie ${meta.no} : ` : ''}${score.label}, ${mmss(score.seconds(score.end) * 1000)}`
      + `${meta.state !== undefined ? `, aléa ${meta.state.toString(16)}` : ''}${extra}`, score.warnings.length > 0);
  },
  onState: showState,
});

/** Essai lancé en dernier : son bouton reste marqué tant que l'essai joue. */
let currentEssai = '';

/**
 * Montre l'état du lecteur : ligne d'état, et boutons de lecture utilisables ou non.
 * Une seule règle : quand rien ne joue, Démarrer est le seul bouton de lecture utilisable ; dès
 * que quelque chose joue (installation ou essai), c'est Arrêter, en rouge, et Démarrer est grisé.
 * - Installation en cours : Démarrer dit « En cours », et les essais sont grisés aussi (un essai
 *   arrêterait l'installation sans le dire).
 * - Essai en cours : le bouton de l'essai qui joue est marqué ; les autres essais restent
 *   utilisables, pour passer de l'un à l'autre.
 * Le focus clavier passe au bouton qui devient utilisable quand celui qui l'avait est grisé.
 * @param {'arrêt'|'boucle'|'unique'} state
 * @returns {void}
 */
function showState(state) {
  $('etat').dataset.etat = state;
  $('etat-texte').textContent = { arrêt: 'À l’arrêt', boucle: 'Installation en cours', unique: 'Essai en cours' }[state];
  $('commandes').dataset.etat = state;
  const start = /** @type {HTMLButtonElement} */ ($('demarrer'));
  const stop = /** @type {HTMLButtonElement} */ ($('arreter'));
  const focused = document.activeElement;
  start.disabled = state !== 'arrêt';
  stop.disabled = state === 'arrêt';
  /** @type {HTMLElement} */ (start.querySelector('.libelle')).textContent = state === 'boucle' ? 'En cours' : 'Démarrer';
  if (focused === start && start.disabled) stop.focus();
  if (focused === stop && stop.disabled) start.focus();
  if (state !== 'unique') currentEssai = '';
  for (const b of document.querySelectorAll('[data-essai]')) {
    b.setAttribute('aria-pressed', String(state === 'unique' && /** @type {HTMLElement} */ (b).dataset.essai === currentEssai));
    /** @type {HTMLButtonElement} */ (b).disabled = state === 'boucle';
  }
}
/** Heure du dernier battement de l'ordonnanceur : un battement qui s'arrête trahit un Worker mort. */
let lastBeat = performance.now();
const ticker = startTicker(() => { lastBeat = performance.now(); player.tick(); }, 25);

/**
 * Diagnostic lu par le superviseur (scripts/superviseur.js), par le protocole DevTools de Chrome,
 * pour décider si la page joue vraiment ou s'il faut basculer sur l'exécuteur headless.
 * `echantillonneur` : null s'il n'est pas activé, « en marche » s'il est prêt et que le son sort,
 * « bloqué » si le rendu audio ne renvoie plus de niveaux depuis 15 s,
 * sinon l'état du contexte audio (« suspended » : le navigateur attend un geste). `niveau` : crête
 * de sa sortie sur le dernier dixième de seconde.
 * @returns {{etat: string, envoyes: number, sortiesMidi: Array<number>, webMidi: boolean, echantillonneur: string|null, niveau: number|null, battementMs: number, sequence: string|null, version: string}}
 */
window.animotsDiagnostic = () => ({
  etat: player.state,
  envoyes: player.sent,
  sortiesMidi: midi ? midi.ports() : [],
  webMidi: midi !== null,
  echantillonneur: !audio ? null : rs && audio.state === 'running' ? (rs.stalled() ? 'bloqué' : 'en marche') : audio.state,
  niveau: rs ? Number(rs.level().toFixed(4)) : null,
  battementMs: Math.round(performance.now() - lastBeat),
  sequence: player.current()?.score.label ?? null,
  version: $('version').textContent ?? '',
});

/**
 * Démarre la boucle des parties, avec la graine saisie ou une graine aléatoire (bouton Démarrer,
 * ou démarrage automatique).
 * @returns {void}
 */
function startInstallation() {
  const text = /** @type {HTMLInputElement} */ ($('graine')).value.trim();
  const graine = text ? Number(text) >>> 0 : crypto.getRandomValues(new Uint32Array(1))[0];
  seed(graine);
  sharedGenerators.reset();
  const parties = gParties();
  partNo = 0;
  journal(`démarrage, graine ${graine} (battement : ${ticker.kind === 'worker' ? 'Worker' : 'setInterval'})`);
  player.startLoop(() => {
    const state = getRandomState();
    const score = calculPartie(parties);
    score.meta = { no: ++partNo, state };
    return score;
  });
}

$('demarrer').addEventListener('click', startInstallation);

// ________________________________________________________ version et cache hors ligne

/**
 * Version jouée, déduite de l'adresse : `…/v1.0/ui/` pour une version figée (étiquette git),
 * sinon la version de développement (branche main) ou une copie locale.
 * @returns {string}
 */
function versionName() {
  const m = /\/(v[\w.-]+)\/ui\//.exec(location.pathname);
  if (m) return `version ${m[1]} (figée)`;
  const local = ['localhost', '127.0.0.1'].includes(location.hostname);
  return local ? 'copie locale' : 'version de développement (main)';
}
$('version').textContent = versionName();

// Le service worker (sw.js, produit par scripts/build-pages.js) met toute la version en cache :
// après une première visite, la page démarre même sans réseau. Il n'existe que sur le site
// publié ; en local, on ne l'enregistre que sur demande (?cache), pour ne pas gêner le développement.
const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);
if ('serviceWorker' in navigator && (!isLocal || new URLSearchParams(location.search).has('cache'))) {
  navigator.serviceWorker.register('../sw.js', { scope: '../' })
    .then(() => navigator.serviceWorker.ready)
    .then((reg) => {
      navigator.serviceWorker.addEventListener('message', (e) => {
        if (e.data?.type === 'version') {
          journal(`page disponible hors ligne (${e.data.files} fichiers en cache, empreinte ${e.data.hash})`);
          $('version').textContent = `${versionName()}, disponible hors ligne`;
        }
      });
      reg.active?.postMessage('version');
    })
    .catch((e) => journal(`cache hors ligne indisponible : ${e.message}`, true));
}

// Démarrage automatique, pour une machine d'installation qui ouvre la page au démarrage :
// ui/?demarrer (et ?demarrer&graine=N pour une graine fixe). La boucle part dès que l'accès
// MIDI est établi et les sorties mémorisées rétablies, ou refusé (lecture simulée).
const params = new URLSearchParams(location.search);
if (params.has('demarrer')) {
  if (params.get('graine')) /** @type {HTMLInputElement} */ ($('graine')).value = params.get('graine') ?? '';
  Promise.all([midiReady, samplerReady]).then(() => {
    journal('démarrage automatique (?demarrer)');
    startInstallation();
  });
}

$('arreter').addEventListener('click', () => {
  player.stop();
  journal('arrêt');
});

for (const b of document.querySelectorAll('[data-essai]')) {
  b.addEventListener('click', () => {
    const name = /** @type {HTMLElement} */ (b).dataset.essai ?? '';
    const score = new Score();
    sharedGenerators.reset();
    ESSAIS[name](score);
    player.playOnce(score);
    currentEssai = name; // après playOnce, dont l'arrêt préalable efface l'essai précédent
    showState(player.state);
  });
}

$('exporter').addEventListener('click', () => {
  const p = player.current();
  if (!p) { journal('rien à exporter : aucune partie ne joue'); return; }
  const url = URL.createObjectURL(new Blob([toSMF(p.score)], { type: 'audio/midi' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${p.score.label.toLowerCase().replace(/\s+/g, '-')}.mid`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

// ________________________________________________________ affichage

// Les 16 enceintes, groupées par zone du parc (*zone1* à *zone3* de Gerland2013-4.lsp), et
// rangées par numéro dans chaque zone. `cells[n]` reste l'enceinte n (canal n + 1).
/** @type {Array<HTMLElement>} */
const cells = [];
for (const [nom, zone] of [['Nord', ZONE1], ['Centre', ZONE2], ['Sud', ZONE3]]) {
  const bloc = document.createElement('div');
  bloc.className = 'zone';
  const titre = document.createElement('span');
  titre.className = 'etiquette';
  titre.textContent = `Zone ${nom.toLowerCase()}`;
  const grille = document.createElement('div');
  grille.className = 'zone-enceintes';
  for (const n of [...zone].sort((a, b) => a - b)) {
    const cell = document.createElement('div');
    cell.className = 'enceinte';
    cell.innerHTML = `<span>${n + 1}</span>`;
    cell.title = `Enceinte ${n + 1} (zone ${nom.toLowerCase()}) : canal ${n + 1} des ports A et B`;
    cell.addEventListener('animationend', () => cell.classList.remove('attaque'));
    grille.append(cell);
    cells[n] = cell;
  }
  bloc.append(titre, grille);
  $('enceintes').append(bloc);
}

/**
 * Fait clignoter une enceinte : relance l'animation `attaque`, à la couleur du port.
 * @param {HTMLElement} cell
 * @param {number} port 0 (A) ou 1 (B).
 * @returns {void}
 */
function flash(cell, port) {
  cell.style.setProperty('--flash', port === 0 ? 'var(--port-a)' : 'var(--port-b)');
  cell.classList.remove('attaque');
  void cell.offsetWidth; // force le navigateur à oublier l'animation en cours, pour la rejouer
  cell.classList.add('attaque');
}

// Attaques : à chaque image, les note-on tombés depuis l'image précédente font clignoter leur
// enceinte, même quand la note d'avant est encore tenue (Tutti, notes enchaînées).
let lastFrame = performance.now();
requestAnimationFrame(function frame() {
  const t = performance.now();
  // onglet revenu au premier plan après une pause : on ne rejoue pas les attaques manquées
  if (t - lastFrame < 250) {
    const hits = sim.onsetsBetween(lastFrame, t);
    cells.forEach((cell, n) => {
      if (hits.has(`1:${n}`)) flash(cell, 1);
      if (hits.has(`0:${n}`)) flash(cell, 0);
    });
  }
  lastFrame = t;
  requestAnimationFrame(frame);
});

setInterval(() => {
  const t = performance.now();
  const p = player.current();
  $('partie').textContent = p?.score.meta?.no ? String(p.score.meta.no) : '—';
  $('sequence').textContent = p?.score.label ?? '—';
  $('duree').textContent = p ? mmss(t - p.start) : '—';
  $('duree-totale').textContent = p ? mmss(p.end - p.start) : '—';
  const avance = p ? Math.min(100, Math.max(0, (100 * (t - p.start)) / Math.max(1, p.end - p.start))) : 0;
  /** @type {HTMLElement} */ ($('progression').firstElementChild).style.width = `${avance}%`;
  $('progression').setAttribute('aria-valuenow', String(Math.round(avance)));
  const on = sim.soundingAt(t);
  cells.forEach((cell, n) => {
    cell.classList.toggle('a', on.has(`0:${n}`));
    cell.classList.toggle('b', on.has(`1:${n}`));
  });
}, 200);

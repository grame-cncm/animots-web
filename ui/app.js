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
 */

import { seed, getRandomState, sharedGenerators, Score } from '../core/index.js';
import { gParties, calculPartie } from '../piece/gerland/parties.js';
import { ESSAIS } from '../piece/gerland/sequences/index.js';
import { Player } from '../output/player.js';
import { openWebMidi } from '../output/webmidi.js';
import { SimulatedSink } from '../output/simulated.js';
import { startTicker } from '../output/ticker.js';
import { toSMF } from '../output/smf.js';

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
  li.textContent = `${new Date().toLocaleTimeString('fr-FR')}  ${text}`;
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
  send(port, data, time) { sim.send(port, data, time); midi?.send(port, data, time); },
  ports() { const p = midi?.ports() ?? []; return p.length ? p : [0, 1]; },
  clear() { midi?.clear(); },
};

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

/** Accès MIDI établi (ou refusé) : le démarrage automatique attend ce moment. */
const midiReady = openWebMidi()
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
  onState(state) {
    $('etat').dataset.etat = state;
    $('etat').textContent = { arrêt: 'À l’arrêt', boucle: 'Installation en cours', unique: 'Essai en cours' }[state];
  },
});
const ticker = startTicker(() => player.tick(), 25);

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
  midiReady.then(() => {
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

const cells = [];
for (let n = 0; n < 16; n++) {
  const cell = document.createElement('div');
  cell.className = 'enceinte';
  cell.innerHTML = `<span>${n + 1}</span>`;
  cell.title = `Enceinte ${n + 1} : canal ${n + 1} des ports A et B`;
  cell.addEventListener('animationend', () => cell.classList.remove('attaque'));
  $('enceintes').append(cell);
  cells.push(cell);
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
  const on = sim.soundingAt(t);
  cells.forEach((cell, n) => {
    cell.classList.toggle('a', on.has(`0:${n}`));
    cell.classList.toggle('b', on.has(`1:${n}`));
  });
}, 200);

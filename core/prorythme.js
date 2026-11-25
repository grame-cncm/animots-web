/**
 * @file Processus d'écriture des notes : `prorythme`, `gnotes`, `n-prorythme`, `n-gnotes`.
 *
 * Portage de CLCE `4-Prorythme/4Processus.lisp` (P.-A. Jaffrennou, 1997-2012) et des fonctions
 * de `3Note-Midi-Finale.lisp` qu'elles appellent pour écrire le MIDI (`accord`, `fait-accord`,
 * `note-motif`, `note-non-trille`, `notes-accord-ord`).
 *
 * ## Ce qui est porté
 *
 * Les quatre paramètres d'objet utilisés par Gerland : `stac`, `proba`, `laccord`, `lecar`.
 * Tout autre paramètre (`sil`, `tril`, `lapog`, `ltransp`, `larpege`, `lcontrol`, `laccelerando`,
 * `pgchange`...) provoque une erreur plutôt que d'être ignoré en silence. La sortie partition
 * Finale/ENIGMA n'est pas portée.
 *
 * ## Fidélité
 *
 * L'ordre et le nombre d'évaluations des générateurs reproduisent ceux du Lisp, car les
 * générateurs à état (`rep`, `s`, `use-gen`...) en dépendent. Pour chaque élément de rythme :
 *
 * | | gnotes (`evenement`) | n-gnotes (`n-evenement`) |
 * |---|---|---|
 * | ordre | canal, laccord, proba, [hauteur], vélocité, stac, **laccord**, lecar | canal, laccord, lecar, proba, [hauteur], vélocité, stac |
 * | proba = 0 | silence ; ni hauteur ni vélocité évaluées | silence ; vélocité évaluée, pas la hauteur |
 * | proba = −1 | silence ; hauteur et vélocité évaluées | idem |
 *
 * `laccord` est donc évalué DEUX fois par élément dans gnotes ; seule la seconde valeur sert à
 * l'accord. Les silences du rythme évaluent eux aussi canal, proba, hauteur et vélocité :
 * `paj-sequence` teste `special-evaluate`, qui rend une valeur absolue. Seul un élément de durée
 * nulle reçoit les constantes 20 et 0.
 *
 * ## La partition active
 *
 * Comme `*out*` en Lisp, la partition où écrivent les objets est une variable du module, fixée
 * par `prorythme` et `nProrythme` pendant leur exécution. Les objets (`gnotes`, `nGnotes`) ne
 * s'utilisent donc qu'à l'intérieur d'un de ces deux processus.
 */

import { G, lift, ctx } from './generators.js';
import { PPQ, ticks, elements, elementDuration, toRest, segments } from './rhythm.js';

/** Tolérance des comparaisons de dates (ticks). */
const EPS = 1e-6;

/** @type {import('./score.js').Score | null} Partition active (`*out*`). */
let out = null;

/**
 * Partition active, ou erreur si aucun processus n'est en cours.
 * @returns {import('./score.js').Score}
 */
function active() {
  if (!out) throw new Error('gnotes / n-gnotes ne s’utilisent qu’à l’intérieur de prorythme ou n-prorythme');
  return out;
}

/**
 * Exécute une fonction avec une partition active, puis restaure la précédente.
 * @template T
 * @param {import('./score.js').Score} score
 * @param {() => T} fn
 * @returns {T}
 */
function withScore(score, fn) {
  const prev = out;
  out = score;
  try { return fn(); } finally { out = prev; }
}

/**
 * `(floor (* x noi))` pour une date positive en noires.
 * @param {number} q Date en noires.
 * @returns {number} Ticks.
 */
const floorTicks = (q) => Math.floor(q * PPQ + EPS);

/**
 * Vérifie que seuls les paramètres portés sont fournis.
 * @param {string} fn Nom de la fonction, pour le message.
 * @param {object} options
 * @returns {void}
 * @throws {Error} Si un paramètre non porté est fourni.
 */
function checkOptions(fn, options) {
  for (const k of Object.keys(options)) {
    if (!['stac', 'proba', 'laccord', 'lecar'].includes(k)) {
      throw new Error(`${fn} : le paramètre :${k} n’est pas porté (Gerland n’utilise que stac, proba, laccord, lecar)`);
    }
  }
}

/**
 * `ACCORD` réduit aux paramètres portés : écrit un élément de rythme, note ou accord multicanal,
 * au curseur de la partition active, puis avance le curseur.
 *
 * Une liaison est coupée comme dans `ACCORD` (voir `segments`). Les listes `laccord` et `lecar`
 * sont tronquées à la plus courte (`compare-liste`). La note j va sur le super-canal
 * `canal + laccord[j]`, à la hauteur `haut + lecar[j]`, sauf si ce super-canal est négatif.
 * @param {number} canal Super-canal de référence.
 * @param {import('./rhythm.js').RhythmElement} element Élément (négatif : silence).
 * @param {number} haut Hauteur de référence.
 * @param {number} vel Vélocité.
 * @param {number} stac Staccato.
 * @param {Array<number>} lac Écarts de canal.
 * @param {Array<number>} lec Écarts de hauteur.
 * @returns {void}
 */
function accord(canal, element, haut, vel, stac, lac, lec) {
  const score = active();
  const n = Math.min(lac.length, lec.length);
  for (const seg of segments(element)) {
    const d = ticks(seg);
    if (seg > 0) {
      for (let j = 0; j < n; j++) {
        if (canal + lac[j] >= 0) score.note(canal + lac[j], haut + lec[j], d, vel, stac);
      }
    }
    score.pRel(d);
  }
}

/**
 * Objet d'écriture rendu par {@link gnotes} : appelé par `prorythme` pour chaque élément.
 * @callback NoteWriter
 * @param {import('./generators.js').Gen} chan Générateur de super-canal.
 * @param {import('./rhythm.js').RhythmElement} element Élément de rythme.
 * @param {import('./generators.js').Gen} haut Générateur de hauteur.
 * @param {import('./generators.js').Gen} vel Générateur de vélocité.
 * @param {import('./generators.js').Ctx} c Contexte (ctime = date de l'élément).
 * @returns {void}
 */

/**
 * `(gnotes :stac :proba :laccord :lecar)` : objet de `prorythme` qui écrit une note, ou un
 * accord multicanal, par élément de rythme. Comme en Lisp, c'est un générateur constant dont la
 * valeur est la fonction d'écriture (`(g (evenement ...))`) : on peut donc choisir entre
 * plusieurs gnotes avec `sel`.
 * @param {object} [options]
 * @param {import('./generators.js').GenLike} [options.stac=1] Staccato : durée MIDI = durée × stac.
 * @param {import('./generators.js').GenLike} [options.proba=1] 0 : silence ; −1 : silence (paramètres évalués) ; autre : note.
 * @param {import('./generators.js').GenLike} [options.laccord=[0]] Écarts de canal de l'accord.
 * @param {import('./generators.js').GenLike} [options.lecar=[0]] Écarts de hauteur de l'accord.
 * @returns {import('./generators.js').Gen} Générateur d'un {@link NoteWriter}.
 * @example gnotes({ laccord: [0, 2, 4], lecar: [0, 0, 0] }) // le même son sur 3 enceintes
 */
export function gnotes(options = {}) {
  checkOptions('gnotes', options);
  const stac = lift(options.stac ?? 1), proba = lift(options.proba ?? 1);
  const laccord = lift(options.laccord ?? [0]), lecar = lift(options.lecar ?? [0]);
  /** @type {NoteWriter} */
  const evenement = (chan, element, haut, vel, c) => {
    const canal = chan(c);
    laccord(c); // premier §laccord : sert aux contrôleurs dans le Lisp, consomme l'état
    const p = proba(c);
    let el = element, h = 10, v = 0;
    if (elementDuration(element) > 0) {
      if (p === -1) { el = toRest(element); h = haut(c); v = vel(c); }
      else if (p === 0) { el = toRest(element); }
      else { h = haut(c); v = vel(c); }
    } else { h = haut(c); v = vel(c); }
    const st = stac(c), lac = laccord(c), lec = lecar(c);
    accord(canal, el, h, v, st, lac, lec);
  };
  return G(evenement);
}

/**
 * `(prorythme chan deb fin objet interval rythme hauteur velocite)` : de `deb` à `fin` (en
 * noires), tire un groupe rythmique ; s'il se termine au plus tard à `fin`, écrit chacun de ses
 * éléments par l'objet, puis avance de `interval` noires ; sinon s'arrête.
 *
 * Évaluations : `deb` avec `(0 0 1 nil)` et `fin` avec `(0 1 1 nil)`, une fois ; par groupe, le
 * rythme puis l'intervalle (avant de savoir si le groupe tient) ; par élément, l'objet puis ce
 * que l'objet évalue (voir {@link gnotes}), avec la date de l'élément comme `ctime`.
 * @param {import('./score.js').Score} score Partition où écrire.
 * @param {import('./generators.js').GenLike} chan Super-canal (0 à 31), évalué par l'objet.
 * @param {import('./generators.js').GenLike} deb Début (noires).
 * @param {import('./generators.js').GenLike} fin Fin (noires).
 * @param {import('./generators.js').GenLike} objet Générateur de {@link NoteWriter} (`gnotes()`).
 * @param {import('./generators.js').GenLike} interval Écart entre deux groupes (noires).
 * @param {import('./generators.js').GenLike} rythme Générateur de rythmes symboliques.
 * @param {import('./generators.js').GenLike} haut Hauteur.
 * @param {import('./generators.js').GenLike} vel Vélocité.
 * @param {...any} rest Le paramètre optionnel `pgchange` du Lisp n'est pas porté.
 * @returns {void}
 * @example prorythme(score, 0, 0, 10, gnotes(), 1/4, [1/4], rnd(60, 64), 100) // 20 doubles croches
 */
export function prorythme(score, chan, deb, fin, objet, interval, rythme, haut, vel, ...rest) {
  if (rest.length) throw new Error('prorythme : le paramètre pgchange n’est pas porté');
  [chan, deb, fin, objet, interval, rythme, haut, vel] = [chan, deb, fin, objet, interval, rythme, haut, vel].map(lift);
  withScore(score, () => {
    const stime = floorTicks(deb(ctx(0, 0, 1, false)));
    const etime = floorTicks(fin(ctx(0, 1, 1, false)));
    score.pAbs(stime);
    let ctime = score.date();
    while (ctime < etime) {
      const c = ctx(stime, ctime, etime, false);
      const el = elements(rythme(c));
      const total = el.reduce((a, e) => a + elementDuration(e), 0);
      const inter = interval(c);
      if (ctime + PPQ * total > etime + EPS) break;
      for (const e of el) {
        const ce = ctx(stime, score.date(), etime, false);
        const writer = objet(ce);
        if (elementDuration(e) > 0) writer(chan, e, haut, vel, ce);
        else writer(chan, e, G(20), G(0), ce);
      }
      score.pRel(floorTicks(Math.abs(inter)));
      ctime = score.date();
    }
  });
}

/**
 * `(n-gnotes chan rythme haut vel :stac :proba :laccord :lecar)` : objet de `n-prorythme`, qui
 * porte lui-même ses quatre paramètres. Appelé (par `n-prorythme`, éventuellement à travers un
 * `sel`), il tire un rythme ; si le rythme tient avant la fin du processus, il écrit ses
 * éléments et avance le curseur, sinon il place le curseur à la fin, ce qui arrête le processus.
 * @param {import('./generators.js').GenLike} chan Super-canal (0 à 31).
 * @param {import('./generators.js').GenLike} rythme Générateur de rythmes symboliques.
 * @param {import('./generators.js').GenLike} haut Hauteur.
 * @param {import('./generators.js').GenLike} vel Vélocité.
 * @param {object} [options] Mêmes paramètres que {@link gnotes}.
 * @param {import('./generators.js').GenLike} [options.stac=1]
 * @param {import('./generators.js').GenLike} [options.proba=1]
 * @param {import('./generators.js').GenLike} [options.laccord=[0]]
 * @param {import('./generators.js').GenLike} [options.lecar=[0]]
 * @returns {import('./generators.js').Gen} Générateur qui écrit dans la partition active.
 */
export function nGnotes(chan, rythme, haut, vel, options = {}) {
  checkOptions('n-gnotes', options);
  [chan, rythme, haut, vel] = [chan, rythme, haut, vel].map(lift);
  const stac = lift(options.stac ?? 1), proba = lift(options.proba ?? 1);
  const laccord = lift(options.laccord ?? [0]), lecar = lift(options.lecar ?? [0]);
  return (c) => {
    const score = active();
    const el = elements(rythme(c));
    const total = el.reduce((a, e) => a + elementDuration(e), 0);
    if (c.ctime + PPQ * total > c.etime + EPS) { score.pAbs(c.etime); return; }
    for (const e of el) {
      const ce = ctx(c.stime, score.date(), c.etime, c.reverse);
      const canal = chan(ce), lac = laccord(ce), lec = lecar(ce);
      const p = proba(ce);
      let x = e, h = 10, v = 0;
      if (elementDuration(e) > 0) {
        if (p === -1) { x = toRest(e); h = haut(ce); v = vel(ce); }
        else if (p === 0) { x = toRest(e); v = vel(ce); }
        else { h = haut(ce); v = vel(ce); }
      } else { h = haut(ce); v = vel(ce); }
      const st = stac(ce);
      accord(canal, x, h, v, st, lac, lec);
    }
  };
}

/**
 * `(n-prorythme deb fin interval objet)` : de `deb` à `fin`, évalue l'objet (qui écrit et avance
 * le curseur), puis avance de `interval` noires si cela reste avant `fin`, et recommence.
 * L'intervalle est évalué avant l'objet, à chaque tour.
 * @param {import('./score.js').Score} score Partition où écrire.
 * @param {import('./generators.js').GenLike} deb Début (noires).
 * @param {import('./generators.js').GenLike} fin Fin (noires).
 * @param {import('./generators.js').GenLike} interval Écart entre deux objets (noires).
 * @param {import('./generators.js').GenLike} objet Générateur qui écrit (`nGnotes(...)`, ou un `sel` d'objets).
 * @returns {void}
 * @example nProrythme(score, 0, 20, h([0, 1/4]), nGnotes(0, [4], h([72, 67, 66, 73]), 90))
 */
export function nProrythme(score, deb, fin, interval, objet) {
  [deb, fin, interval, objet] = [deb, fin, interval, objet].map(lift);
  withScore(score, () => {
    const stime = floorTicks(deb(ctx(0, 0, 1, false)));
    const etime = floorTicks(fin(ctx(0, 1, 1, false)));
    score.pAbs(stime);
    let ctime = score.date();
    for (;;) {
      const c = ctx(stime, ctime, etime, false);
      const inter = interval(c);
      if (!(ctime < etime)) break;
      objet(c);
      if (score.date() + PPQ * Math.abs(inter) > etime + EPS) break;
      score.pRel(floorTicks(Math.abs(inter)));
      ctime = score.date();
    }
  });
}

/**
 * `(place-tempo date bpm)` : écrit un changement de tempo.
 * @param {import('./score.js').Score} score
 * @param {number} date Date en noires.
 * @param {number} bpm Noires par minute.
 * @returns {void}
 */
export function placeTempo(score, date, bpm) {
  score.tempo(floorTicks(date), bpm);
}

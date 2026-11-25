#!/usr/bin/env node
/**
 * @file Phase 4 : compare, note à note, le code Lisp d'origine (exécuté dans SBCL) et le portage
 * JavaScript, avec le même générateur d'aléa et les mêmes graines.
 *
 * Si le portage est fidèle, les deux programmes font exactement les mêmes tirages, dans le même
 * ordre, et écrivent la même partition. Au premier écart, le rapport montre les événements qui
 * diffèrent.
 *
 * Usage :
 *
 *     node validation/compare.js [--seeds N] [--only 2,3,10] [--parties N] [--verbose]
 *
 * - `--seeds N` : graines 1 à N pour chaque séquence et chaque essai (5 par défaut) ;
 * - `--only` : restreint aux séquences listées ;
 * - `--parties N` : compare aussi N parties enchaînées par g-parties, pour chaque graine (12 par défaut, 0 pour aucune) ;
 * - `--verbose` : détaille chaque cas.
 *
 * Il faut SBCL (`sbcl` dans le PATH). Code de sortie 1 s'il y a un écart.
 */

import { spawnSync } from 'node:child_process';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { seed, G, Score, sharedGenerators } from '../core/index.js';
import { SEQUENCES, ESSAIS } from '../piece/gerland/sequences/index.js';
import { DUREES } from '../piece/gerland/config.js';
import { gParties, calculPartie } from '../piece/gerland/parties.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

/** Essais : nom Lisp -> nom JavaScript. */
export const ESSAIS_LISP = Object.freeze({ test: 'essai', test1: 'cercle1', test1bis: 'essai1bis', test2: 'cercle2', test3: 'tutti', test4: 'alterne' });

/**
 * Événement normalisé, comparable entre Lisp et JavaScript.
 * @typedef {object} NormEvent
 * @property {string} key Clé canonique (type, date, port, canal, valeurs).
 * @property {number} tick Date, pour trier et situer les écarts.
 */

/**
 * Fin tirée pour une séquence et une graine (même formule pour les deux côtés).
 * @param {number} num
 * @param {number} graine
 * @returns {number} Fin en noires.
 */
export function finFor(num, graine) {
  const [min, max] = DUREES[num];
  return min + (graine * 37) % (max - min + 1);
}

/**
 * Normalise les événements écrits par le Lisp (bouchons MidiShare de harness.lisp).
 * Les notes longues (key-on puis key-off) sont réunies en une note ; les notes de vélocité 0
 * sont écartées, comme le fait la partition JavaScript ; les pitch-bends sont comptés à part.
 * @param {Array<Array<any>>} events
 * @returns {{events: Array<NormEvent>, bends: number}} `bends` : pitch-bends non centrés.
 */
export function normalizeLisp(events) {
  const out = [], open = new Map();
  let bends = 0;
  for (const [type, tick, ...v] of events) {
    if (type === 'note') {
      const [pitch, dur, vel, chan, port] = v;
      if (vel > 0) out.push(noteEvent(tick, port, chan, pitch, Math.max(0, dur), vel));
    } else if (type === 'on') {
      const [pitch, vel, chan, port] = v;
      const k = `${port}:${chan}:${pitch}`;
      if (!open.has(k)) open.set(k, []);
      open.get(k).push({ tick, vel });
    } else if (type === 'off') {
      const [pitch, , chan, port] = v;
      const on = open.get(`${port}:${chan}:${pitch}`)?.shift();
      if (on && on.vel > 0) out.push(noteEvent(on.tick, port, chan, pitch, tick - on.tick, on.vel));
    } else if (type === 'cc') {
      const [ctrl, value, chan, port] = v;
      out.push({ key: `cc ${tick} ${port}:${chan} ${ctrl}=${value}`, tick });
    } else if (type === 'tempo') {
      out.push({ key: `tempo ${tick} ${Math.round(60e6 / v[0])}`, tick });
    } else if (type === 'bend') {
      if (v[0] !== 0) bends++;
    } else {
      out.push({ key: `${type} ${tick} ${v.join(' ')}`, tick });
    }
  }
  return { events: out, bends };
}

/**
 * Note normalisée.
 * @param {number} tick
 * @param {number} port
 * @param {number} chan
 * @param {number} pitch
 * @param {number} dur
 * @param {number} vel
 * @returns {NormEvent}
 */
function noteEvent(tick, port, chan, pitch, dur, vel) {
  return { key: `note ${tick} ${port}:${chan} p${pitch} d${dur} v${vel}`, tick };
}

/**
 * Normalise les événements d'une partition JavaScript.
 * @param {Score} score
 * @returns {{events: Array<NormEvent>, bends: number}}
 */
export function normalizeJs(score) {
  const out = [];
  let bends = 0;
  for (const e of score.events) {
    if (e.type === 'note') {
      out.push(noteEvent(e.tick, e.port, e.chan, e.pitch, e.dur, e.vel));
      if (e.bend !== 0) bends++;
    } else if (e.type === 'cc') out.push({ key: `cc ${e.tick} ${e.port}:${e.chan} ${e.ctrl}=${e.value}`, tick: e.tick });
    else if (e.type === 'tempo') out.push({ key: `tempo ${e.tick} ${e.bpm}`, tick: e.tick });
  }
  return { events: out, bends };
}

/**
 * Compare deux listes d'événements comme des multiensembles.
 * @param {Array<NormEvent>} a Lisp.
 * @param {Array<NormEvent>} b JavaScript.
 * @returns {{equal: boolean, onlyLisp: Array<string>, onlyJs: Array<string>}} Écarts, triés par date.
 */
export function diffEvents(a, b) {
  const count = new Map();
  for (const e of a) count.set(e.key, (count.get(e.key) ?? 0) + 1);
  for (const e of b) count.set(e.key, (count.get(e.key) ?? 0) - 1);
  const onlyLisp = [], onlyJs = [];
  const tickOf = (k) => Number(k.split(' ')[1]);
  for (const [k, n] of count) {
    for (let i = 0; i < n; i++) onlyLisp.push(k);
    for (let i = 0; i < -n; i++) onlyJs.push(k);
  }
  onlyLisp.sort((x, y) => tickOf(x) - tickOf(y));
  onlyJs.sort((x, y) => tickOf(x) - tickOf(y));
  return { equal: onlyLisp.length === 0 && onlyJs.length === 0, onlyLisp, onlyJs };
}

/**
 * Séquences sensibles aux flottants, avec la raison. Toutes les autres doivent être identiques
 * au tick près.
 *
 * La séquence 29 ajoute aux dates des décalages décimaux (`transf-dat` avec ±0.05, ±0.15...).
 * En Lisp, ces littéraux sont des flottants simple précision ; en JavaScript, des doubles. Un
 * `floor` tombe parfois d'un côté et parfois de l'autre de l'entier : un tick d'écart (0,2 ms),
 * qui s'accumule dans un processus (3,6 ms au plus mesurés sur 20 graines). Rarement, une note
 * franchit alors une limite de `seq` et change de hauteur. Reproduire exactement la simple
 * précision demanderait de typer chaque nombre du portage, pour un écart inaudible, et rien ne
 * garantit que les flottants de LispWorks en 2013 étaient ceux de SBCL.
 */
export const FLOAT_SENSITIVE = Object.freeze({
  'SEQUENCE 29': 'décalages décimaux de transf-dat : flottants simple précision en Lisp, doubles en JavaScript',
});

/** Tolérances de l'appariement des séquences sensibles aux flottants (ticks). */
const TOLERANCE = Object.freeze({ tick: 50, dur: 2 });

/**
 * Apparie les notes restées seules de chaque côté quand elles ne diffèrent que par un léger
 * décalage temporel : même port, canal, hauteur et vélocité, date à `TOLERANCE.tick` près et
 * durée à `TOLERANCE.dur` près. Chaque note Lisp prend la note JavaScript la plus proche.
 * @param {Array<string>} onlyLisp Clés de notes seulement en Lisp.
 * @param {Array<string>} onlyJs Clés de notes seulement en JS.
 * @returns {{matched: number, maxShift: number, onlyLisp: Array<string>, onlyJs: Array<string>}}
 *   Nombre de notes appariées, plus grand décalage de date (ticks), et ce qui reste.
 */
export function tolerantMatch(onlyLisp, onlyJs) {
  const parse = (k) => {
    const m = /^note (\d+) (\S+) p(\d+) d(\d+) v(\d+)$/.exec(k);
    return m ? { tick: +m[1], where: m[2], pitch: m[3], dur: +m[4], vel: m[5] } : null;
  };
  const js = onlyJs.map(parse);
  const restLisp = [];
  let matched = 0, maxShift = 0;
  for (const k of onlyLisp) {
    const a = parse(k);
    let best = -1, bestShift = Infinity;
    if (a) {
      js.forEach((b, i) => {
        if (!b || b.where !== a.where || b.pitch !== a.pitch || b.vel !== a.vel || Math.abs(b.dur - a.dur) > TOLERANCE.dur) return;
        const shift = Math.abs(b.tick - a.tick);
        if (shift <= TOLERANCE.tick && shift < bestShift) { best = i; bestShift = shift; }
      });
    }
    if (best >= 0) { js[best] = null; matched++; maxShift = Math.max(maxShift, bestShift); } else restLisp.push(k);
  }
  return { matched, maxShift, onlyLisp: restLisp, onlyJs: onlyJs.filter((_, i) => js[i] !== null) };
}

/**
 * Lance SBCL sur une liste de cas et rend le résultat.
 * @param {Array<string>} specs Cas au format de harness.lisp.
 * @returns {{cases: Array<{case: string, parts: Array<{label: string|null, error: string|null, events: Array<Array<any>>}>}>, nonIntegerDates: number}}
 * @throws {Error} Si SBCL est absent ou échoue.
 */
export function runLisp(specs) {
  const dir = mkdtempSync(join(tmpdir(), 'animots-lisp-'));
  const file = join(dir, 'ref.json');
  try {
    const r = spawnSync('sbcl', ['--script', join(ROOT, 'validation/lisp/harness.lisp'), ROOT, file, ...specs], { encoding: 'utf8', maxBuffer: 64 << 20 });
    if (r.error) throw new Error(`SBCL introuvable (${r.error.message}) : installer SBCL (MacPorts : sudo port install sbcl)`);
    if (r.status !== 0) throw new Error(`SBCL a échoué :\n${r.stderr.split('\n').filter((l) => !/^\d+: /.test(l)).slice(0, 20).join('\n')}`);
    const data = JSON.parse(readFileSync(file, 'utf8'));
    data.nonIntegerDates = Number(/nonIntegerDates=(\d+)/.exec(r.stderr)?.[1] ?? 0);
    return data;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Calcule côté JavaScript le même cas que harness.lisp.
 * @param {string} spec
 * @returns {Array<{label: string, error: string|null, score: Score}>} Une entrée par partie.
 */
export function runJs(spec) {
  const [kind, ...f] = spec.split(':');
  const guarded = (fn) => { const sc = new Score(); let error = null; try { fn(sc); } catch (e) { error = e.message; } return { label: sc.label, error, score: sc }; };
  if (kind === 'seq') {
    const [n, graine, fin] = f.map(Number);
    seed(graine); sharedGenerators.reset();
    return [guarded((sc) => SEQUENCES[n](sc, G(0), G(fin)))];
  }
  if (kind === 'essai') {
    seed(Number(f[1])); sharedGenerators.reset();
    return [guarded((sc) => ESSAIS[ESSAIS_LISP[f[0]]](sc))];
  }
  if (kind === 'parties') {
    const [graine, count] = f.map(Number);
    seed(graine); sharedGenerators.reset();
    const gp = gParties(), parts = [];
    for (let k = 0; k < count; k++) {
      const sc = calculPartie(gp);
      parts.push({ label: sc.label, error: sc.warnings.find((w) => /erreur/.test(w)) ?? null, score: sc });
    }
    return parts;
  }
  throw new Error(`cas inconnu : ${spec}`);
}

/**
 * Résultat de la comparaison d'un cas.
 * @typedef {object} CaseResult
 * @property {string} spec
 * @property {boolean} equal Aucun écart, hors écarts de flottants des séquences de {@link FLOAT_SENSITIVE}.
 * @property {Array<string>} problems Descriptions des écarts.
 * @property {number} notes Nombre de notes comparées (côté Lisp).
 * @property {number} shifted Notes appariées avec un décalage (séquences sensibles aux flottants).
 * @property {number} maxShift Plus grand décalage de date accepté (ticks).
 * @property {number} floatResidue Notes restées sans partenaire dans ces séquences (limite de `seq` franchie).
 */

/**
 * Compare Lisp et JavaScript sur une liste de cas.
 * @param {Array<string>} specs
 * @returns {{results: Array<CaseResult>, nonIntegerDates: number}}
 */
export function compare(specs) {
  const lisp = runLisp(specs);
  const results = lisp.cases.map((c) => {
    const js = runJs(c.case);
    const problems = [];
    let notes = 0, shifted = 0, maxShift = 0, floatResidue = 0;
    if (js.length !== c.parts.length) problems.push(`${c.parts.length} parties en Lisp, ${js.length} en JS`);
    c.parts.forEach((lp, k) => {
      const jp = js[k];
      if (!jp) return;
      const where = c.parts.length > 1 ? `partie ${k + 1} : ` : '';
      if (lp.label !== jp.label) problems.push(`${where}nom « ${lp.label} » en Lisp, « ${jp.label} » en JS`);
      if (Boolean(lp.error) !== Boolean(jp.error)) problems.push(`${where}erreur Lisp « ${lp.error} », erreur JS « ${jp.error} »`);
      const a = normalizeLisp(lp.events), b = normalizeJs(jp.score);
      notes += a.events.filter((e) => e.key.startsWith('note')).length;
      let d = diffEvents(a.events, b.events);
      if (!d.equal && FLOAT_SENSITIVE[lp.label]) {
        // séquence sensible aux flottants : décalages mesurés et acceptés, notes restantes comptées
        const m = tolerantMatch(d.onlyLisp, d.onlyJs);
        shifted += m.matched;
        maxShift = Math.max(maxShift, m.maxShift);
        floatResidue += Math.max(m.onlyLisp.length, m.onlyJs.length);
        d = { equal: true, onlyLisp: [], onlyJs: [] };
      }
      if (!d.equal) {
        problems.push(`${where}${d.onlyLisp.length} événement(s) seulement en Lisp, ${d.onlyJs.length} seulement en JS`
          + `\n      Lisp : ${d.onlyLisp.slice(0, 4).join(' | ') || '—'}\n      JS   : ${d.onlyJs.slice(0, 4).join(' | ') || '—'}`);
      }
      if (a.bends !== b.bends) problems.push(`${where}${a.bends} pitch-bend(s) non centré(s) en Lisp, ${b.bends} en JS`);
    });
    return { spec: c.case, equal: problems.length === 0, problems, notes, shifted, maxShift, floatResidue };
  });
  return { results, nonIntegerDates: lisp.nonIntegerDates };
}

/**
 * Liste des cas à comparer.
 * @param {object} options
 * @param {number} options.seeds Nombre de graines.
 * @param {Array<number>} options.only Séquences à garder (toutes si vide).
 * @param {number} options.parties Nombre de parties enchaînées par graine (0 : aucune).
 * @returns {Array<string>}
 */
export function cases({ seeds, only, parties }) {
  const nums = only.length ? only : Object.keys(SEQUENCES).map(Number);
  const out = [];
  for (let s = 1; s <= seeds; s++) {
    for (const n of nums) out.push(`seq:${n}:${s}:${finFor(n, s)}`);
    if (!only.length) for (const e of Object.keys(ESSAIS_LISP)) out.push(`essai:${e}:${s}`);
    if (parties > 0 && !only.length) out.push(`parties:${s}:${parties}`);
  }
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const arg = (name, def) => { const i = process.argv.indexOf(name); return i < 0 ? def : process.argv[i + 1]; };
  const seeds = Number(arg('--seeds', 5));
  const only = (arg('--only', '') || '').split(',').filter(Boolean).map(Number);
  const parties = Number(arg('--parties', 12));
  const verbose = process.argv.includes('--verbose');
  const specs = cases({ seeds, only, parties });
  const t0 = Date.now();
  const { results, nonIntegerDates } = compare(specs);
  const bad = results.filter((r) => !r.equal);
  for (const r of results) {
    const fl = r.shifted || r.floatResidue ? ` ; flottants : ${r.shifted} décalées (≤ ${r.maxShift} ticks), ${r.floatResidue} sans partenaire` : '';
    if (!r.equal || verbose) console.log(`${r.equal ? 'identique' : 'ÉCART    '}  ${r.spec}  (${r.notes} notes${fl})${r.problems.map((p) => `\n    ${p}`).join('')}`);
  }
  const sum = (f) => results.reduce((a, r) => a + r[f], 0);
  const maxShift = Math.max(0, ...results.map((r) => r.maxShift));
  console.log(`\n${results.length} cas, ${sum('notes')} notes comparées : ${results.length - bad.length} conformes, ${bad.length} avec écart`
    + ` (${((Date.now() - t0) / 1000).toFixed(1)} s ; dates non entières côté Lisp : ${nonIntegerDates})`);
  if (sum('shifted') || sum('floatResidue')) {
    console.log(`Séquences sensibles aux flottants (${Object.keys(FLOAT_SENSITIVE).join(', ')}) : ${sum('shifted')} notes décalées de`
      + ` ${maxShift} ticks au plus (${(maxShift / 5040 * 1000).toFixed(2)} ms), ${sum('floatResidue')} sans partenaire ; toutes les autres sont identiques au tick près.`);
  }
  process.exit(bad.length ? 1 : 0);
}

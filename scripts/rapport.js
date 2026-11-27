#!/usr/bin/env node
/**
 * @file Bilan d'un journal de l'exécuteur headless, pour un essai de longue durée (72 heures et
 * plus) : relances, parties, arrêts, alertes, et tendances des lignes de mesures (`--mesures`).
 *
 *     node scripts/rapport.js <journal>
 *
 * `make rapport` lance la même chose sur le journal de `make essai-long`. Code de sortie 1 s'il
 * y a des signaux d'alerte :
 * - **relance** : plus d'un démarrage dans le journal (launchd ou le chien de garde ont relancé
 *   l'exécuteur) ;
 * - **arrêt inattendu** : un arrêt qui ne vient ni de la durée demandée, ni d'un signal ;
 * - **alerte** : une ligne « ATTENTION » (partie muette, repli en stéréo…) ;
 * - **mémoire** : la mémoire (RSS) qui grandit de plus de 10 % par jour, d'après une régression
 *   linéaire sur les mesures d'au moins six heures ;
 * - **retard** : des messages MIDI partis plus de 50 ms en retard ;
 * - **trou** : plus de trois périodes de mesures sans aucune ligne dans le journal, alors que
 *   l'exécuteur tournait (blocage, veille de la machine).
 */

import { readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** Croissance de la mémoire au-delà de laquelle on alerte (fraction par jour). */
export const CROISSANCE_MAX = 0.10;
/** Retard des messages au-delà duquel on alerte (ms). */
export const RETARD_MAX = 50;

/**
 * Bilan d'un journal.
 * @typedef {object} Bilan
 * @property {number|null} debut Date de la première ligne (ms depuis 1970).
 * @property {number|null} fin Date de la dernière ligne.
 * @property {number} demarrages Démarrages (lignes « démarrage, graine »).
 * @property {number} parties Parties commencées.
 * @property {Array<string>} arrets Raisons des arrêts.
 * @property {Array<string>} alertes Lignes « ATTENTION ».
 * @property {Array<{t: number, rss: number, tas: number, notes: number, retard: number|null}>} mesures
 * @property {number|null} croissance Croissance de la mémoire, en fraction par jour (null si moins de six heures de mesures).
 * @property {number} retardMax Retard maximal relevé (ms).
 * @property {number} trouMax Plus long intervalle sans ligne dans le journal (ms).
 * @property {Array<string>} signaux Signaux d'alerte (vide si tout va bien).
 */

/**
 * Pente d'une régression linéaire y = a + b·x.
 * @param {Array<number>} xs
 * @param {Array<number>} ys
 * @returns {number} b
 */
function pente(xs, ys) {
  const n = xs.length, mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let k = 0; k < n; k++) { num += (xs[k] - mx) * (ys[k] - my); den += (xs[k] - mx) ** 2; }
  return den ? num / den : 0;
}

/**
 * Analyse le texte d'un journal de l'exécuteur.
 * @param {string} texte
 * @returns {Bilan}
 */
export function analyser(texte) {
  const b = {
    debut: null, fin: null, demarrages: 0, parties: 0, arrets: [], alertes: [], mesures: [],
    croissance: null, retardMax: 0, trouMax: 0, signaux: [],
  };
  let precedente = null, periodeMesures = null, enMarche = false;
  for (const ligne of texte.split('\n')) {
    const m = /^(\d{4}-\d\d-\d\dT[\d:.]+Z) {2}(.*)$/.exec(ligne);
    if (!m) continue;
    const t = Date.parse(m[1]), msg = m[2];
    b.debut ??= t;
    b.fin = t;
    if (enMarche && precedente !== null) b.trouMax = Math.max(b.trouMax, t - precedente);
    precedente = t;
    if (msg.startsWith('démarrage, graine ')) { b.demarrages++; enMarche = true; }
    else if (/^partie \d+ : /.test(msg)) b.parties++;
    else if (msg.startsWith('arrêt (')) { b.arrets.push(/^arrêt \(([^)]*)\)/.exec(msg)?.[1] ?? msg); enMarche = false; }
    else if (/ATTENTION/.test(msg)) b.alertes.push(msg.trim());
    const mm = /^mesures : mémoire ([\d.]+) Mo \(tas ([\d.]+) Mo\), \d+ parties calculées en [\d.]+ h, (\d+) notes actives(?:, retard maximal ([\d.]+) ms)?/.exec(msg);
    if (mm) {
      const mesure = { t, rss: Number(mm[1]), tas: Number(mm[2]), notes: Number(mm[3]), retard: mm[4] === undefined ? null : Number(mm[4]) };
      const prev = b.mesures.at(-1);
      if (prev && prev.t < t) periodeMesures = Math.min(periodeMesures ?? Infinity, t - prev.t);
      b.mesures.push(mesure);
      if (mesure.retard !== null) b.retardMax = Math.max(b.retardMax, mesure.retard);
    }
    const ra = /retard maximal ([\d.]+) ms/.exec(msg);
    if (ra && msg.startsWith('arrêt (')) b.retardMax = Math.max(b.retardMax, Number(ra[1]));
  }
  if (b.mesures.length >= 3 && b.mesures.at(-1).t - b.mesures[0].t >= 6 * 3600000) {
    const jours = b.mesures.map((x) => (x.t - b.mesures[0].t) / 86400000);
    const rss = b.mesures.map((x) => x.rss);
    const moyenne = rss.reduce((a, c) => a + c, 0) / rss.length;
    b.croissance = pente(jours, rss) / moyenne;
  }
  if (b.demarrages > 1) b.signaux.push(`${b.demarrages - 1} relance(s) : ${b.demarrages} démarrages dans le journal`);
  const inattendus = b.arrets.filter((r) => !/^durée de |^SIG/.test(r));
  if (inattendus.length) b.signaux.push(`arrêt(s) inattendu(s) : ${inattendus.join(' ; ')}`);
  if (b.alertes.length) b.signaux.push(`${b.alertes.length} alerte(s) « ATTENTION »`);
  if (b.croissance !== null && b.croissance > CROISSANCE_MAX) b.signaux.push(`mémoire en hausse de ${(100 * b.croissance).toFixed(1)} % par jour`);
  if (b.retardMax > RETARD_MAX) b.signaux.push(`messages jusqu'à ${b.retardMax.toFixed(1)} ms en retard`);
  if (periodeMesures !== null && b.trouMax > 3 * periodeMesures) b.signaux.push(`journal muet pendant ${(b.trouMax / 60000).toFixed(1)} min`);
  return b;
}

/**
 * Texte du bilan, pour la console.
 * @param {Bilan} b
 * @returns {string}
 */
export function formatBilan(b) {
  const h = (ms) => (ms / 3600000).toFixed(1);
  const premiere = b.mesures[0], derniere = b.mesures.at(-1);
  const lignes = [
    b.debut === null ? 'journal vide' : `journal de ${new Date(b.debut).toISOString()} à ${new Date(b.fin).toISOString()} (${h(b.fin - b.debut)} h)`,
    `${b.demarrages} démarrage(s), ${b.parties} parties, arrêts : ${b.arrets.length ? b.arrets.join(' ; ') : 'aucun'}`,
    premiere
      ? `mémoire : ${premiere.rss} -> ${derniere.rss} Mo (max ${Math.max(...b.mesures.map((x) => x.rss))} Mo) sur ${b.mesures.length} mesures`
        + `${b.croissance === null ? ' (moins de six heures : pas de tendance)' : `, tendance ${(100 * b.croissance).toFixed(2)} % par jour`}`
      : 'aucune ligne de mesures',
    `retard maximal : ${b.retardMax.toFixed(1)} ms ; notes actives au plus : ${b.mesures.length ? Math.max(...b.mesures.map((x) => x.notes)) : 0} ; plus long silence du journal : ${(b.trouMax / 60000).toFixed(1)} min`,
    ...b.alertes.slice(0, 10).map((a) => `alerte : ${a}`),
    b.signaux.length ? `SIGNAUX D'ALERTE :\n  ${b.signaux.join('\n  ')}` : 'aucun signal d’alerte',
  ];
  return lignes.join('\n');
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  const fichier = process.argv[2];
  if (!fichier) { console.error('usage : node scripts/rapport.js <journal>'); process.exit(2); }
  const b = analyser(readFileSync(fichier, 'utf8'));
  console.log(formatBilan(b));
  process.exit(b.signaux.length ? 1 : 0);
}

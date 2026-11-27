/**
 * @file Tests du bilan de journal (scripts/rapport.js) : journal sain, puis chaque signal
 * d'alerte (relance, arrêt inattendu, alerte, mémoire en hausse, retard, journal muet).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyser, formatBilan } from '../scripts/rapport.js';

/**
 * Ligne de journal datée.
 * @param {number} heures Heures depuis le début.
 * @param {string} texte
 * @returns {string}
 */
const ligne = (heures, texte) => `${new Date(Date.UTC(2026, 10, 27) + heures * 3600000).toISOString()}  ${texte}`;

/**
 * Ligne de mesures.
 * @param {number} heures
 * @param {number} rss Mémoire (Mo).
 * @param {number} [retard=1.2] Retard maximal (ms).
 * @returns {string}
 */
const mesure = (heures, rss, retard = 1.2) => ligne(heures, `mesures : mémoire ${rss} Mo (tas 8.0 Mo), 10 parties calculées en ${heures.toFixed(2)} h, 4 notes actives, retard maximal ${retard} ms`);

/**
 * Journal de 24 heures, mesures toutes les 10 minutes.
 * @param {(h: number) => number} rss Mémoire en fonction de l'heure.
 * @returns {Array<string>}
 */
function journal(rss) {
  const l = [ligne(0, 'démarrage, graine 2013'), ligne(0, 'partie 1 : SEQUENCE 1, 0:25, aléa 7dd')];
  for (let k = 1; k <= 144; k++) l.push(mesure(k / 6, rss(k / 6)));
  l.push(ligne(24.01, 'partie 2 : SEQUENCE 29, 3:19, aléa 7dd'), ligne(24.02, 'arrêt (SIGTERM) ; 1000 messages envoyés, retard maximal 3.0 ms'));
  return l;
}

test('journal sain de 24 h : aucun signal, tendance de mémoire calculée', () => {
  const b = analyser(journal(() => 120).join('\n'));
  assert.deepEqual(b.signaux, [], formatBilan(b));
  assert.equal(b.demarrages, 1);
  assert.equal(b.parties, 2);
  assert.equal(b.mesures.length, 144);
  assert.ok(Math.abs(b.croissance) < 1e-9);
  assert.equal(b.retardMax, 3);
});

test('signaux : relance, arrêt inattendu, alerte, mémoire en hausse, retard, journal muet', () => {
  const l = journal((h) => 100 + h); // + 24 Mo par jour sur environ 112 Mo : plus de 10 % par jour
  l.splice(40, 0, ligne(6.6, '  ATTENTION : la partie précédente est restée muette malgré 120 notes'));
  l.splice(60, 30); // cinq heures sans aucune ligne
  l.push(ligne(24.1, 'démarrage, graine 77 (démarrage n° 2 de ce journal)'), mesure(24.2, 130, 80), ligne(24.3, 'arrêt (fin) ; 10 messages envoyés'));
  const b = analyser(l.join('\n'));
  const s = b.signaux.join('\n');
  assert.match(s, /1 relance/);
  assert.match(s, /arrêt\(s\) inattendu\(s\) : fin/);
  assert.match(s, /1 alerte\(s\) « ATTENTION »/);
  assert.match(s, /mémoire en hausse de [\d.]+ % par jour/);
  assert.match(s, /messages jusqu'à 80\.0 ms en retard/);
  assert.match(s, /journal muet pendant [\d.]+ min/);
});

test('moins de six heures de mesures : pas de tendance, pas de signal de mémoire', () => {
  const l = [ligne(0, 'démarrage, graine 1'), mesure(0.5, 100), mesure(1, 200), mesure(1.5, 300), ligne(2, 'arrêt (durée de 7200 s atteinte) ; 1 messages envoyés')];
  const b = analyser(l.join('\n'));
  assert.equal(b.croissance, null);
  assert.deepEqual(b.signaux, []);
});

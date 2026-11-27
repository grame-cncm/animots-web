#!/usr/bin/env node
/**
 * @file Vieillissement accéléré : fait jouer au vrai lecteur (`output/player.js`) des milliers de
 * parties de `g-parties`, sur beaucoup de graines, avec une horloge factice. Des semaines
 * d'installation se calculent ainsi en quelques secondes.
 *
 *     node scripts/endurance.js [--graines N] [--parties P] [--depuis G]
 *
 * Par défaut, 50 graines de 200 parties chacune (environ 450 heures d'installation). Code de
 * sortie 1 si un problème est trouvé. `make endurance` lance la même chose ; une version courte
 * tourne dans `npm test` (tests/endurance.test.js).
 *
 * Problèmes cherchés :
 * - **arrêt** : la boucle des parties passe à l'arrêt (le bogue de la partie vide, corrigé le
 *   27 novembre 2026, arrêtait l'installation environ toutes les cinq heures) ;
 * - **trou ou chevauchement** : une partie ne commence pas exactement à la fin de la précédente ;
 * - **désordre** : un message envoyé avant le précédent dans le temps, au sein d'une partie ;
 * - **avertissement inconnu** : une erreur pendant le calcul d'une partie (ignore-errors), autre
 *   que l'anomalie connue de la séquence 21 (notes du « port C », muettes en 2013 aussi) ;
 * - **accumulation de notes** : des notes qui restent actives et s'accumulent d'une partie à
 *   l'autre (le maximum de notes actives est rapporté) ;
 * - **mémoire** : le tas JavaScript avant et après (rapporté, mesuré après ramasse-miettes si
 *   Node est lancé avec `--expose-gc`).
 */

import { fileURLToPath } from 'node:url';
import { realpathSync } from 'node:fs';
import { seed, sharedGenerators } from '../core/index.js';
import { gParties, calculPartie } from '../piece/gerland/parties.js';
import { Player } from '../output/player.js';

/** Avertissements connus et acceptés : l'anomalie de la séquence 21 (README, « Anomalies »). */
export const AVERTISSEMENTS_CONNUS = [/^note hors limites : /];

/**
 * Pas de l'horloge factice entre deux battements (ms). Le lecteur réel bat toutes les 25 ms ;
 * un pas plus grand reste correct, puisque tout se décide à l'heure des messages.
 */
const PAS = 250;

/**
 * Rapport d'un vieillissement accéléré.
 * @typedef {object} Rapport
 * @property {number} parties Parties jouées.
 * @property {number} heures Durée d'installation simulée (heures).
 * @property {number} vides Parties de durée nulle.
 * @property {Map<string, number>} avertissements Avertissements par séquence et par sorte.
 * @property {Array<string>} problemes Problèmes trouvés (vide si tout va bien).
 * @property {number} notesActivesMax Maximum de notes actives à la fois.
 * @property {number} calculMax Temps de calcul maximal d'une partie (ms).
 * @property {number} tasDebut Tas JavaScript au début (octets).
 * @property {number} tasFin Tas JavaScript à la fin (octets).
 */

/**
 * Tas JavaScript utilisé, après ramasse-miettes si possible.
 * @returns {number}
 */
function tas() {
  globalThis.gc?.();
  return process.memoryUsage().heapUsed;
}

/**
 * Fait jouer des parties à travers le lecteur, avec une horloge factice.
 * @param {object} [o]
 * @param {Array<number>} [o.graines] Graines de l'aléa (une boucle de parties par graine).
 * @param {number} [o.parties=200] Parties par graine.
 * @param {typeof Player} [o.lecteur=Player] Classe du lecteur (pour vérifier l'outil sur une version fautive).
 * @returns {Rapport}
 */
export function vieillir({ graines = Array.from({ length: 50 }, (_, k) => k + 1), parties = 200, lecteur = Player } = {}) {
  const r = {
    parties: 0, heures: 0, vides: 0, avertissements: new Map(), problemes: [],
    notesActivesMax: 0, calculMax: 0, tasDebut: tas(), tasFin: 0,
  };
  for (const g of graines) {
    seed(g);
    sharedGenerators.reset();
    const gp = gParties();
    const clock = { t: 0 };
    let n = 0, arret = false, finPrecedente = null, dernierMessage = -Infinity;
    const sink = {
      send(port, data, time) {
        if (time + 1e-6 < dernierMessage) r.problemes.push(`graine ${g} : message en désordre (${time.toFixed(3)} ms après ${dernierMessage.toFixed(3)} ms)`);
        dernierMessage = Math.max(dernierMessage, time);
      },
      ports: () => [0, 1],
      clear() {},
    };
    const player = new lecteur({
      sink,
      now: () => clock.t,
      onState: (s) => { if (s === 'arrêt') arret = true; },
      onPart(score, start, end) {
        if (finPrecedente !== null && Math.abs(start - finPrecedente) > 1e-6) {
          r.problemes.push(`graine ${g}, ${score.label} : commence à ${start.toFixed(3)} ms au lieu de ${finPrecedente.toFixed(3)} ms`);
        }
        finPrecedente = end;
        // une nouvelle partie commence : les messages de la suivante peuvent précéder les derniers de la courante
        dernierMessage = Math.min(dernierMessage, start);
      },
    });
    player.startLoop(() => {
      const t0 = performance.now();
      const score = calculPartie(gp);
      r.calculMax = Math.max(r.calculMax, performance.now() - t0);
      n++;
      r.parties++;
      if (score.end === 0) r.vides++;
      r.heures += score.seconds(score.end) / 3600;
      for (const w of score.warnings) {
        const sorte = w.replace(/[-\d.]+/g, '#');
        const cle = `${score.label} : ${sorte}`;
        r.avertissements.set(cle, (r.avertissements.get(cle) ?? 0) + 1);
        if (!AVERTISSEMENTS_CONNUS.some((re) => re.test(w))) r.problemes.push(`graine ${g}, ${score.label} : avertissement inconnu : ${w}`);
      }
      return score;
    });
    while (n < parties && !arret) {
      clock.t += PAS;
      player.tick();
      r.notesActivesMax = Math.max(r.notesActivesMax, player.active.size);
    }
    if (arret) r.problemes.push(`graine ${g} : la boucle s'est arrêtée après ${n} parties`);
    player.stop();
  }
  r.tasFin = tas();
  return r;
}

/**
 * Texte du rapport, pour la console.
 * @param {Rapport} r
 * @returns {string}
 */
export function formatRapport(r) {
  const lignes = [
    `${r.parties} parties, ${r.heures.toFixed(1)} h d'installation simulée (${(r.heures / 24).toFixed(1)} jours)`,
    `parties vides : ${r.vides} ; notes actives au plus : ${r.notesActivesMax} ; calcul d'une partie : ${r.calculMax.toFixed(1)} ms au plus`,
    `tas JavaScript : ${(r.tasDebut / 1e6).toFixed(1)} Mo -> ${(r.tasFin / 1e6).toFixed(1)} Mo`,
    ...[...r.avertissements].map(([k, n]) => `avertissement (${n}) : ${k}`),
  ];
  lignes.push(r.problemes.length ? `PROBLÈMES (${r.problemes.length}) :\n  ${r.problemes.slice(0, 20).join('\n  ')}` : 'aucun problème');
  return lignes.join('\n');
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  const args = process.argv.slice(2);
  const opt = (nom, defaut) => { const k = args.indexOf(nom); return k >= 0 ? Number(args[k + 1]) : defaut; };
  const nombre = opt('--graines', 50), depuis = opt('--depuis', 1);
  const t0 = performance.now();
  const r = vieillir({ graines: Array.from({ length: nombre }, (_, k) => depuis + k), parties: opt('--parties', 200) });
  console.log(formatRapport(r));
  console.log(`calculé en ${((performance.now() - t0) / 1000).toFixed(1)} s`);
  process.exit(r.problemes.length ? 1 : 0);
}

/**
 * @file Vieillissement accéléré (scripts/endurance.js), version courte : quelques graines, dont la
 * graine 7, dont la partie 2 est vide. La version longue se lance par `make endurance`.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { vieillir, formatRapport, AVERTISSEMENTS_CONNUS } from '../scripts/endurance.js';

test('vieillissement accéléré : 240 parties enchaînées sans arrêt, sans trou, sans avertissement inconnu', () => {
  const r = vieillir({ graines: [1, 2, 3, 4, 5, 7], parties: 40 });
  assert.deepEqual(r.problemes, [], formatRapport(r));
  assert.equal(r.parties, 240);
  assert.ok(r.vides >= 1, 'la graine 7 donne une partie vide');
  assert.ok(r.heures > 8, `${r.heures.toFixed(1)} h simulées`);
  assert.ok(r.notesActivesMax < 500, `${r.notesActivesMax} notes actives à la fois`);
});

test('avertissements connus : seule l’anomalie de la séquence 21 est acceptée', () => {
  assert.ok(AVERTISSEMENTS_CONNUS.some((re) => re.test('note hors limites : canal 40, hauteur 60, vélocité 80 au tick 0')));
  assert.ok(!AVERTISSEMENTS_CONNUS.some((re) => re.test('erreur pendant le calcul de la partie (ignore-errors) : x')));
});

/**
 * @file Tests de la sortie simulée (output/simulated.js) : notes qui sonnent et attaques, qui
 * pilotent l'affichage des enceintes du lecteur.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SimulatedSink } from '../output/simulated.js';

/**
 * Sortie simulée remplie d'une suite de notes enchaînées sur le canal 1 du port A, comme dans
 * Tutti : une note par seconde, chacune relâchée juste avant la suivante.
 * @returns {SimulatedSink}
 */
function enchainees() {
  const sim = new SimulatedSink();
  for (let k = 0; k < 3; k++) {
    sim.send(0, [0x90, 48, 80], k * 1000);
    sim.send(0, [0x80, 48, 0], k * 1000 + 999.8);
  }
  return sim;
}

test('soundingAt : notes enchaînées, le canal sonne en continu', () => {
  const sim = enchainees();
  for (const t of [10, 500, 1000, 1500, 2500]) assert.deepEqual([...sim.soundingAt(t)], ['0:0'], `à ${t} ms`);
  assert.deepEqual([...sim.soundingAt(3500)], []);
});

test('onsetsBetween : une attaque par note, même quand le canal sonne déjà', () => {
  const sim = enchainees();
  assert.deepEqual([...sim.onsetsBetween(990, 1010)], ['0:0']); // nouvelle note à 1 000 ms
  assert.deepEqual([...sim.onsetsBetween(1010, 1990)], []); // note tenue : pas d'attaque
  assert.deepEqual([...sim.onsetsBetween(-1, 0)], ['0:0']); // borne de fin incluse
  assert.deepEqual([...sim.onsetsBetween(0, 1)], []); // borne de début exclue
});

test('onsetsBetween : ports et canaux distingués ; note-on de vélocité 0 et contrôleurs ignorés', () => {
  const sim = new SimulatedSink();
  sim.send(1, [0x92, 60, 90], 100);
  sim.send(0, [0x95, 60, 0], 100);
  sim.send(0, [0xb3, 9, 3], 100);
  assert.deepEqual([...sim.onsetsBetween(50, 150)], ['1:2']);
});

test('arrêt : CC123 coupe les notes du canal pour soundingAt', () => {
  const sim = new SimulatedSink();
  sim.send(0, [0x90, 48, 80], 0);
  sim.send(0, [0xb0, 123, 0], 500);
  assert.deepEqual([...sim.soundingAt(400)], ['0:0']);
  assert.deepEqual([...sim.soundingAt(600)], []);
});

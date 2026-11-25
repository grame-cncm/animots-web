/**
 * @file Tests du superviseur (scripts/superviseur.js) : options, jugement de la page, bascule sur
 * l'exécuteur headless.
 *
 * Les essais avec le vrai Chrome (sans fenêtre, profil temporaire, page servie en local) sont
 * sautés si Chrome n'est pas installé. Ils n'ouvrent aucun port MIDI : l'exécuteur de secours
 * tourne en lecture simulée.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs, evaluateHealth, DEFAULTS } from '../scripts/superviseur.js';

const SCRIPT = fileURLToPath(new URL('../scripts/superviseur.js', import.meta.url));
const SERVE = fileURLToPath(new URL('../scripts/serve.js', import.meta.url));
const HAS_CHROME = existsSync(DEFAULTS.chrome);

/** Diagnostic d'une page qui joue vraiment. */
const SAIN = { etat: 'boucle', envoyes: 120, sortiesMidi: [0, 1], webMidi: true, battementMs: 30, sequence: 'SEQUENCE 3', version: 'version v1.0 (figée)' };

test('parseArgs : valeurs par défaut, options, erreurs', () => {
  const o = parseArgs(['--sortie-a', 'IAC Bus 1', '--delai-demarrage', '30', '--sans-fenetre']);
  assert.equal(o.url, DEFAULTS.url);
  assert.equal(o.sortieA, 'IAC Bus 1');
  assert.equal(o.delaiDemarrage, 30);
  assert.equal(o.sansFenetre, true);
  assert.equal(o.accepterSimule, false);
  assert.throws(() => parseArgs(['--bidon']), /option inconnue/);
  assert.throws(() => parseArgs(['--url']), /valeur manquante/);
});

test('evaluateHealth : une page qui joue vraiment', () => {
  assert.deepEqual(evaluateHealth(SAIN), { ok: true, raison: '' });
});

test('evaluateHealth : chaque cause de bascule', () => {
  const cas = [
    [null, /pas chargée/],
    [{ ...SAIN, etat: 'arrêt' }, /boucle des parties arrêtée/],
    [{ ...SAIN, webMidi: false, sortiesMidi: [] }, /Web MIDI refusé/],
    [{ ...SAIN, sortiesMidi: [0] }, /ports A et B non reliés/],
    [{ ...SAIN, battementMs: 9000 }, /ordonnanceur arrêté \(dernier battement il y a 9 s\)/],
  ];
  for (const [diag, motif] of cas) {
    const h = evaluateHealth(diag);
    assert.equal(h.ok, false);
    assert.match(h.raison, motif);
  }
});

test('evaluateHealth : --accepter-simule accepte une lecture simulée, pas une boucle arrêtée', () => {
  assert.equal(evaluateHealth({ ...SAIN, webMidi: false, sortiesMidi: [] }, { accepterSimule: true }).ok, true);
  assert.equal(evaluateHealth({ ...SAIN, etat: 'arrêt' }, { accepterSimule: true }).ok, false);
});

/**
 * Lance le superviseur avec un journal temporaire.
 * @param {Array<string>} args
 * @returns {Promise<{code: number, log: string}>}
 */
function runSupervisor(args) {
  const dir = mkdtempSync(join(tmpdir(), 'animots-sup-'));
  const journal = join(dir, 'session.log');
  return new Promise((resolve) => {
    const p = spawn(process.execPath, [SCRIPT, '--journal', journal, '--simule-headless', ...args], { stdio: 'ignore' });
    p.on('exit', (code) => {
      const log = existsSync(journal) ? readFileSync(journal, 'utf8') : '';
      rmSync(dir, { recursive: true, force: true });
      resolve({ code: code ?? 0, log });
    });
  });
}

test('Chrome absent : bascule immédiate sur l’exécuteur headless, arrêt propre', async () => {
  const { code, log } = await runSupervisor(['--chrome', '/nexiste/pas', '--duree', '2', '--intervalle', '1']);
  assert.equal(code, 0);
  assert.match(log, /bascule sur l'exécuteur headless : Chrome introuvable/);
  assert.match(log, /partie 1 : SEQUENCE 1/);
  assert.match(log, /exécuteur headless terminé \(code 0\)/);
});

test('vrai Chrome : page sans MIDI basculée, page simulée acceptée gardée', { skip: HAS_CHROME ? false : 'Chrome absent' }, async () => {
  const port = 18000 + Math.floor(Math.random() * 1000);
  const server = spawn(process.execPath, [SERVE, String(port)], { stdio: 'ignore' });
  const profiles = [mkdtempSync(join(tmpdir(), 'animots-chrome-')), mkdtempSync(join(tmpdir(), 'animots-chrome-'))];
  try {
    await new Promise((r) => setTimeout(r, 500));
    const common = ['--url', `http://localhost:${port}/ui/?demarrer`, '--port-debogage', String(port + 1000), '--sans-fenetre', '--intervalle', '1'];
    const a = await runSupervisor([...common, '--profil', profiles[0], '--delai-demarrage', '6', '--duree', '10']);
    assert.match(a.log, /au bout de 6 s, la page ne joue pas : Web MIDI refusé/);
    assert.match(a.log, /Chrome fermé/);
    assert.match(a.log, /sorties : port A -> simulé/);
    const b = await runSupervisor([...common, '--profil', profiles[1], '--accepter-simule', '--duree', '6']);
    assert.match(b.log, /la page joue \(copie locale/);
    assert.doesNotMatch(b.log, /bascule/);
    for (const p of profiles) assert.notEqual(spawnSync('pgrep', ['-f', `--user-data-dir=${p}`]).status, 0, 'Chrome resté ouvert');
  } finally {
    server.kill();
    for (const p of profiles) rmSync(p, { recursive: true, force: true });
  }
});

/**
 * @file Tests de la construction du site GitHub Pages (scripts/build-pages.js) : fichiers
 * publiés, service worker de chaque version, versions figées extraites des étiquettes.
 *
 * L'essai hors ligne lui-même (service worker dans un vrai navigateur, réseau coupé) se fait
 * dans Chrome ; le navigateur de ces tests, Node, n'a pas de service worker.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildPages, addServiceWorker, serviceWorker, versionTags, APP_PATHS } from '../scripts/build-pages.js';

test('serviceWorker : liste des fichiers, empreinte, cache par portée, ignoreSearch', () => {
  const sw = serviceWorker(['ui/', 'ui/app.js'], 'abc123');
  assert.match(sw, /const HASH = 'abc123';/);
  assert.match(sw, /const FILES = \["","ui\/","ui\/app.js"\];/);
  assert.match(sw, /ignoreSearch: true/);
  assert.match(sw, /self\.skipWaiting\(\)/);
  assert.match(sw, /k\.startsWith\(PREFIX\) && k !== CACHE/);
  assert.doesNotThrow(() => new Function(sw)); // syntaxe valide
});

test('addServiceWorker : empreinte qui suit le contenu ; node-midi.js et .nojekyll exclus', () => {
  const dir = mkdtempSync(join(tmpdir(), 'animots-sw-'));
  try {
    mkdirSync(join(dir, 'ui'));
    mkdirSync(join(dir, 'output'));
    writeFileSync(join(dir, 'ui/app.js'), 'a');
    writeFileSync(join(dir, 'output/node-midi.js'), 'n');
    writeFileSync(join(dir, '.nojekyll'), '');
    const a = addServiceWorker(dir);
    const sw = readFileSync(join(dir, 'sw.js'), 'utf8');
    assert.ok(sw.includes('"ui/app.js"') && !sw.includes('node-midi') && !sw.includes('nojekyll'));
    assert.equal(a.files, 3); // '', 'ui/', 'ui/app.js'
    assert.equal(addServiceWorker(dir).hash, a.hash); // même contenu, même empreinte (sw.js ignoré)
    writeFileSync(join(dir, 'ui/app.js'), 'b');
    assert.notEqual(addServiceWorker(dir).hash, a.hash);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('buildPages : page et modules publiés, sources et tests non publiés, une version par étiquette', () => {
  const out = mkdtempSync(join(tmpdir(), 'animots-site-'));
  try {
    const versions = buildPages(out);
    for (const p of APP_PATHS) assert.ok(existsSync(join(out, p)), p);
    for (const p of ['ui/index.html', 'ui/app.js', 'core/index.js', 'piece/gerland/sequences/s36.js', 'output/ticker-worker.js', 'sw.js']) {
      assert.ok(existsSync(join(out, p)), p);
    }
    for (const p of ['source', 'tests', 'validation', 'transpiler', 'scripts', 'deploy', 'node_modules', 'package.json']) {
      assert.ok(!existsSync(join(out, p)), `${p} ne doit pas être publié`);
    }
    const sw = readFileSync(join(out, 'sw.js'), 'utf8');
    assert.ok(sw.includes('"piece/gerland/sequences/s29.js"') && sw.includes('"output/ticker-worker.js"'));
    const tags = versionTags();
    assert.deepEqual(versions.map((v) => v.name), ['main', ...tags]);
    for (const t of tags) assert.ok(existsSync(join(out, t, 'ui/index.html')) && existsSync(join(out, t, 'sw.js')), t);
    assert.deepEqual(JSON.parse(readFileSync(join(out, 'versions.json'), 'utf8')).map((v) => v.name), ['main', ...tags]);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

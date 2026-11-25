#!/usr/bin/env node
/**
 * @file Construit le site GitHub Pages : la version courante à la racine, chaque étiquette
 * `vX.Y` dans son propre dossier, et dans chaque version un service worker qui la rend
 * jouable hors ligne.
 *
 * Usage :
 *
 *     node scripts/build-pages.js <dossier de sortie>
 *
 * Contenu produit :
 * - `<sortie>/` : la version de l'arbre de travail (la branche `main` dans le workflow) ;
 * - `<sortie>/vX.Y/` : chaque étiquette git `v*`, extraite telle qu'elle a été étiquetée.
 *   Une étiquette ne bouge pas : son adresse joue toujours la même chose. C'est l'adresse à
 *   donner à une machine d'installation ;
 * - `sw.js` dans chaque version : le service worker. Il met en cache tous les fichiers dont
 *   la page a besoin, dès la première visite, puis les sert depuis le cache (hors ligne compris).
 *   Son nom de cache contient une empreinte du contenu : une nouvelle publication remplace le
 *   cache d'un bloc, sans mélanger deux versions ;
 * - `versions.json` : la liste des versions publiées.
 *
 * Seuls les fichiers de la page sont publiés (voir {@link APP_PATHS}), pas les sources Lisp, les
 * tests ni les outils.
 */

import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

/** Chemins publiés : la page et les modules qu'elle charge. */
export const APP_PATHS = ['index.html', '.nojekyll', 'ui', 'core', 'output', 'piece'];

/** Fichiers publiés mais non mis en cache : inutiles au navigateur. */
const NOT_CACHED = new Set(['.nojekyll', 'output/node-midi.js']);

/**
 * Liste récursive des fichiers d'un dossier, chemins relatifs avec des `/`.
 * @param {string} dir
 * @returns {Array<string>}
 */
function filesUnder(dir) {
  const out = [];
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else out.push(relative(dir, p).split(sep).join('/'));
    }
  };
  walk(dir);
  return out.sort();
}

/**
 * Texte du service worker d'une version.
 * @param {Array<string>} files Fichiers à mettre en cache, relatifs au dossier de la version.
 * @param {string} hash Empreinte du contenu de ces fichiers.
 * @returns {string}
 */
export function serviceWorker(files, hash) {
  return `/* Service worker du lecteur Animots, produit par scripts/build-pages.js : ne pas modifier.
 * Met en cache, à l'installation, tous les fichiers de cette version, puis les sert depuis le
 * cache (premier recours), ce qui rend la page jouable hors ligne après une première visite.
 * Une nouvelle publication change l'empreinte, donc le nom du cache : la nouvelle version est
 * mise en cache d'un bloc et l'ancienne supprimée. La page déjà ouverte garde ses modules ; elle
 * passe à la nouvelle version au prochain chargement. */
const HASH = '${hash}';
const FILES = ${JSON.stringify(['', ...files], null, 0)};
const PREFIX = 'animots:' + self.registration.scope + ':';
const CACHE = PREFIX + HASH;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE)
    .then((c) => c.addAll(FILES.map((f) => new Request(new URL(f, self.registration.scope), { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith(PREFIX) && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith(self.registration.scope)) return;
  // ignoreSearch : ui/?demarrer est servi par l'entrée ui/
  e.respondWith(caches.open(CACHE)
    .then((c) => c.match(req, { ignoreSearch: true }))
    .then((hit) => hit || fetch(req)));
});

self.addEventListener('message', (e) => {
  if (e.data === 'version') e.source.postMessage({ type: 'version', hash: HASH, files: FILES.length });
});
`;
}

/**
 * Ajoute le service worker à une version déjà copiée dans un dossier.
 * @param {string} dir Dossier de la version.
 * @returns {{files: number, hash: string}} Nombre de fichiers en cache et empreinte.
 */
export function addServiceWorker(dir) {
  const files = filesUnder(dir).filter((f) => !NOT_CACHED.has(f) && f !== 'sw.js');
  const h = createHash('sha256');
  for (const f of files) { h.update(f); h.update(readFileSync(join(dir, f))); }
  const hash = h.digest('hex').slice(0, 16);
  // le répertoire ui/ est demandé tel quel par la page d'accueil et par le kiosque
  writeFileSync(join(dir, 'sw.js'), serviceWorker(['ui/', ...files], hash));
  return { files: files.length + 2, hash };
}

/**
 * Étiquettes de version du dépôt (`v*`), triées.
 * @returns {Array<string>}
 */
export function versionTags() {
  const out = execFileSync('git', ['tag', '--list', 'v*'], { cwd: ROOT, encoding: 'utf8' }).trim();
  return out ? out.split('\n').sort((a, b) => a.localeCompare(b, 'en', { numeric: true })) : [];
}

/**
 * Extrait d'une étiquette les chemins publiés qui y existent.
 * @param {string} tag
 * @param {string} dest
 * @returns {void}
 */
function extractTag(tag, dest) {
  const present = APP_PATHS.filter((p) => {
    try { execFileSync('git', ['cat-file', '-e', `${tag}:${p}`], { cwd: ROOT, stdio: 'ignore' }); return true; } catch { return false; }
  });
  mkdirSync(dest, { recursive: true });
  const tar = execFileSync('git', ['archive', '--format=tar', tag, ...present], { cwd: ROOT, maxBuffer: 256 << 20 });
  execFileSync('tar', ['-x', '-C', dest], { input: tar });
}

/**
 * Construit tout le site.
 * @param {string} out Dossier de sortie (vidé d'abord).
 * @returns {Array<{name: string, files: number, hash: string}>} Versions publiées.
 */
export function buildPages(out) {
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  for (const p of APP_PATHS) cpSync(join(ROOT, p), join(out, p), { recursive: true });
  const versions = [{ name: 'main', ...addServiceWorker(out) }];
  for (const tag of versionTags()) {
    const dest = join(out, tag);
    extractTag(tag, dest);
    versions.push({ name: tag, ...addServiceWorker(dest) });
  }
  writeFileSync(join(out, 'versions.json'), `${JSON.stringify(versions, null, 2)}\n`);
  return versions;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const out = process.argv[2];
  if (!out) { console.error('usage : node scripts/build-pages.js <dossier de sortie>'); process.exit(2); }
  for (const v of buildPages(out)) console.log(`${v.name.padEnd(8)} ${v.files} fichiers en cache, empreinte ${v.hash}`);
}

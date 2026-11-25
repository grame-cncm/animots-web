#!/usr/bin/env node
/**
 * @file Petit serveur de fichiers statiques pour la page du lecteur.
 *
 * Le Web MIDI et les modules JavaScript exigent une page servie en http (pas un fichier ouvert
 * directement), et le Web MIDI un contexte sûr : `http://localhost` en est un. Le serveur
 * n'écoute que sur la machine (127.0.0.1) et sert la racine du projet ; `/` mène à `/ui/`.
 *
 * Usage :
 *
 *     node scripts/serve.js [port]      (8080 par défaut, ou la variable PORT)
 */

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, normalize, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = Number(process.argv[2] ?? process.env.PORT ?? 8080);

/** Types MIME des fichiers servis. */
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.mid': 'audio/midi', '.md': 'text/markdown; charset=utf-8',
};

/**
 * Répond à une requête : fichier du projet, index.html d'un dossier, ou 404.
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 * @returns {Promise<void>}
 */
async function handle(req, res) {
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (url.pathname === '/') { res.writeHead(302, { location: '/ui/' }); res.end(); return; }
  let path = normalize(join(ROOT, decodeURIComponent(url.pathname)));
  if (!path.startsWith(ROOT.endsWith(sep) ? ROOT : ROOT + sep)) { res.writeHead(403); res.end(); return; }
  try {
    if ((await stat(path)).isDirectory()) path = join(path, 'index.html');
    const body = await readFile(path);
    res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('introuvable');
  }
}

createServer((req, res) => { handle(req, res); }).listen(PORT, '127.0.0.1', () => {
  console.log(`Lecteur Animots : http://localhost:${PORT}/ui/  (Chrome ou Edge pour le MIDI)`);
});

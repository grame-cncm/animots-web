/**
 * @file Couverture de l'annexe A du document d'analyse : chaque opérateur appelé par
 * Gerland2013-4.lsp a son équivalent JavaScript exporté.
 *
 * Les processus (phase 2) y figurent aussi : prorythme, gnotes, n-prorythme, n-gnotes,
 * place-prog, place-tempo, print-dialog.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as core from '../core/index.js';
import * as tools from '../piece/gerland/tools.js';
import * as config from '../piece/gerland/config.js';

/** Opérateur Lisp -> [module, nom JavaScript]. */
const ANNEXE_A = {
  'g / °': [core, 'G'], 'l': [core, 'L'], 'h': [core, 'h'], 'hs': [core, 'hs'], 's': [core, 's'],
  'rnd': [core, 'rnd'], 'rep': [core, 'rep'], 'alt': [core, 'alt'], 'sel': [core, 'sel'],
  'sel-al (Gerland)': [tools, 'selAl'], 'i': [core, 'i'], 'seq': [core, 'seq'], 'mem': [core, 'mem'],
  'dif': [core, 'dif'], 'shift': [core, 'shift'], 'add': [core, 'add'], 'sub': [core, 'sub'],
  'mult': [core, 'mult'], 'div': [core, 'div'], 'floo': [core, 'floo'], 'greplie': [core, 'greplie'],
  'lst': [core, 'lst'], 'concat': [core, 'concat'], 'nconcat': [core, 'nconcat'],
  'xconcat': [tools, 'xconcat'], 'nconcat-spe4': [tools, 'nconcatSpe4'], 'list-nvaleur': [tools, 'listNvaleur'],
  'glist': [tools, 'glist'], 'glistedate': [tools, 'glistedate'], 'glistedur': [tools, 'glistedur'],
  'date-dur': [tools, 'dateDur'], 'transf-dat': [tools, 'transfDat'], 'traj': [tools, 'traj'],
  'groupe': [tools, 'groupe'], 'share-gen': [core, 'shareGen'], 'use-gen': [core, 'useGen'],
  'free-gen': [core, 'freeGen'], '2/3c (…)': [core, 't'], 'trajectoires': [config, 'trajectoires'],
  'listgroupe': [config, 'listgroupe'], '(g (car (l 1 deb)))': [tools, 'once'],
  'prorythme': [core, 'prorythme'], 'gnotes': [core, 'gnotes'], 'n-prorythme': [core, 'nProrythme'],
  'n-gnotes': [core, 'nGnotes'], 'place-prog': [tools, 'placeProg'], 'place-tempo': [core, 'placeTempo'],
  'print-dialog': [tools, 'printDialog'], 'init / *out*': [core, 'Score'],
};

test('chaque opérateur de l’annexe A a son équivalent JavaScript', () => {
  for (const [lisp, [mod, name]] of Object.entries(ANNEXE_A)) {
    assert.equal(typeof mod[name], 'function', `${lisp} -> ${name} manquant`);
  }
});

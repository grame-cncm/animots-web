/**
 * @file Séquence 14 (3' - 8').
 *
 * Généré par `npm run transpile` (transpiler/) depuis source/Gerland2013-4.lsp.
 * Ne pas modifier à la main : corriger le transpileur, puis régénérer.
 * tests/transpile.test.js vérifie que ce fichier est à jour.
 *
 * Commentaire d'origine :
 *     Séquence 14 (3' - 8')
 *     Motif doux et bouclé
 *     version pour 16 points       Multi M5
 *     avec motifs cécilia doux aigu et bouclés
 *     avec coucou cécilia
 *     avec itératifs cécilia
 *     avec rivière
 */

import { add, freeGen, gnotes, h, mult, nconcat, placeTempo, prorythme, rep, rnd, shareGen, useGen } from '../../../core/index.js';
import { once, placeProg, printDialog } from '../tools.js';
import { GACCORD, GACCORD_DEMI, GECAR, MULTIS, ZONE1, ZONE2, ZONE3 } from '../config.js';

/**
 * Séquence 14.
 * Traduction de `(sequence-14 deb fin)`, lignes 2295 à 2377.
 * @param {import('../../../core/score.js').Score} score Partition où écrire.
 * @param {import('../../../core/generators.js').GenLike} deb Début (noires), tiré une fois.
 * @param {import('../../../core/generators.js').GenLike} fin Fin (noires), tirée une fois.
 * @returns {void}
 */
export function sequence14(score, deb, fin) {
  printDialog(score, 'SEQUENCE 14');
  // prog-change
  placeProg(score, 0, MULTIS.m5);
  placeTempo(score, 0, 60);
  const deb2 = once(deb);
  const fin2 = once(fin);
  // motifs cécilia doux aigu et bouclés
  // zone1
  prorythme(score, add(16, h(ZONE1)), deb2, fin2,
    gnotes({ proba: h([1, 1, 1, 1, 1, 0]) }),
    h([0, 1, 2, 3, 4, 6, 8, 10, 12]),
    h([[8], [9], [10], [11], [14], [4]]),
    rnd(96, 111),
    h([80, 100, 110]));
  // zone2
  prorythme(score, add(16, h(ZONE2)), deb2, fin2,
    gnotes({ proba: h([1, 1, 1, 1, 1, 0]) }),
    h([0, 1, 2, 3, 4, 6, 8, 10, 12]),
    h([[8], [9], [10], [11], [14], [4]]),
    rnd(96, 111),
    h([80, 100, 110]));
  // zone3
  prorythme(score, add(16, h(ZONE3)), deb2, fin2,
    gnotes({ proba: h([1, 1, 1, 1, 1, 0]) }),
    h([0, 1, 2, 3, 4, 6, 8, 10, 12]),
    h([[8], [9], [10], [11], [14], [4]]),
    rnd(96, 111),
    h([80, 100, 110]));
  // coucou cécilia
  prorythme(score, rnd(16, 31), add(deb2, h([0, 1, 2, 4, 6, 7, 8, 10])), fin2,
    gnotes({ proba: h([1, 1, 1, 1, 1, 0]) }),
    h([0, 2, 4, 6, 8, 10]),
    h([[8], [9], [10], [11], [14], [4]]),
    rnd(55, 67),
    90);
  // itératifs cécilia
  shareGen('repet', rnd(1, 6));
  prorythme(score, rnd(16, 31), add(deb2, h([0, 1, 2, 4, 6, 7, 8, 10])), fin2,
    gnotes({ proba: h([1, 1, 1, 1, 1, 0]) }),
    h([0, 2, 4, 6, 8, 10]),
    nconcat(useGen('repet'), h([[1 / 4], [1 / 4], [1 / 8]])),
    rnd(67, 96),
    rep(h([80, 100]), useGen('repet')));
  freeGen('repet');
  // cécilia coucou (n=111)
  shareGen('n1', h([2, 3]));
  prorythme(score, rep(rnd(16, 31), mult(2, useGen('n1'))), deb2, fin2,
    gnotes(),
    h([8, 15 / 2, 32, 24]),
    nconcat(useGen('n1'), [2, -1]),
    111,
    rep(h([80, 100, 117]), mult(2, useGen('n1'))));
  freeGen('n1');
  // fond monocanal Rivière par moment (proba 1/3)
  prorythme(score, rnd(0, 15), deb2, fin2,
    gnotes({ proba: h([1, 0]), laccord: GACCORD_DEMI, lecar: GECAR }),
    24,
    [12],
    rnd(126, 127),
    70);
  // fond general court pseudo-nuit  proba 1/2
  prorythme(score, 16, deb2, fin2,
    gnotes({ laccord: GACCORD, lecar: GECAR, proba: h([1, 0]) }),
    h([0, 8, 16, 20, 4]),
    h([[4], [6], [8], [10]]),
    rnd(52, 54),
    60);
}

/**
 * @file Séquence 19 (4' - 7').
 *
 * Généré par `npm run transpile` (transpiler/) depuis source/Gerland2013-4.lsp.
 * Ne pas modifier à la main : corriger le transpileur, puis régénérer.
 * tests/transpile.test.js vérifie que ce fichier est à jour.
 *
 * Commentaire d'origine :
 *     Séquence 19 (4' - 7')
 *     Gouttes répétées et gong et voix répétées
 *     version pour 16 points       Multi M5
 *     avec triangle régulier tout canaux
 *     avec voix soufflée rare
 *     avec voix rares tout canaux 2 fois
 */

import { add, div, floo, gnotes, h, i, nGnotes, nProrythme, placeTempo, prorythme, rep, rnd, sel } from '../../../core/index.js';
import { once, placeProg, printDialog, selAl } from '../tools.js';
import { GACCORD, GECAR, MULTIS, ZONE1, ZONE2, ZONE3 } from '../config.js';

/**
 * Séquence 19.
 * Traduction de `(sequence-19 deb fin)`, lignes 2979 à 3096.
 * @param {import('../../../core/score.js').Score} score Partition où écrire.
 * @param {import('../../../core/generators.js').GenLike} deb Début (noires), tiré une fois.
 * @param {import('../../../core/generators.js').GenLike} fin Fin (noires), tirée une fois.
 * @returns {void}
 */
export function sequence19(score, deb, fin) {
  printDialog(score, 'SEQUENCE 19');
  // prog-change
  placeProg(score, 0, MULTIS.m5);
  placeTempo(score, 0, 60);
  const deb2 = once(deb);
  const fin2 = once(fin);
  nProrythme(score, add(deb2, h([1, 2, 3, 4, 5, 6, 7, 8, 10, 0, 1 / 2, 1 / 4, 1 / 8, 1 / 16])), fin2, h([1, 2, 3, 4, 0, 1 / 4, 1 / 8, 1 / 16]),
    nGnotes(rnd(16, 31), h([[7], [8], [9], [10], [12], [14]]), 77, 100));
  nProrythme(score, add(deb2, h([1, 2, 3, 4, 5, 6, 7, 8, 10, 0, 1 / 2, 1 / 4, 1 / 8, 1 / 16])), fin2, h([1, 2, 3, 4, 0, 1 / 4, 1 / 8, 1 / 16]),
    nGnotes(rnd(16, 31), h([[7], [8], [9], [10], [12], [14]]), 77, 100));
  nProrythme(score, add(deb2, h([1, 2, 3, 4, 5, 6, 7, 8, 10, 0, 1 / 2, 1 / 4, 1 / 8, 1 / 16])), fin2, h([1, 2, 3, 4, 0, 1 / 4, 1 / 8, 1 / 16]),
    nGnotes(rnd(16, 31), h([[7], [8], [9], [10], [12], [14]]), 77, 100));
  prorythme(score, add(16, h(ZONE1)), add(deb2, h([0, 1 / 2, 1, 1 / 4, 3 / 2])), fin2,
    gnotes(),
    selAl(floo(i(4, 0)), 0, 2, 4, 8, 16),
    selAl(floo(i(6, 0)), [16], [14], [11], [10], [8], [6], [4], [4]),
    rnd(61, 62),
    127);
  prorythme(score, add(16, h(ZONE1)), add(deb2, h([0, 1 / 2, 1, 1 / 4, 3 / 2])), fin2,
    gnotes(),
    selAl(floo(i(4, 0)), 0, 2, 4, 8, 16),
    selAl(floo(i(6, 0)), [16], [14], [11], [10], [8], [6], [4], [4]),
    rnd(61, 62),
    127);
  prorythme(score, add(16, h(ZONE1)), add(deb2, h([0, 1 / 2, 1, 1 / 4, 3 / 2])), fin2,
    gnotes(),
    selAl(floo(i(4, 0)), 0, 2, 4, 8, 16),
    selAl(floo(i(6, 0)), [16], [14], [11], [10], [8], [6], [4], [4]),
    rnd(61, 62),
    127);
  prorythme(score, add(16, h(ZONE2)), add(deb2, h([0, 1 / 2, 1, 1 / 4, 3 / 2])), fin2,
    gnotes(),
    selAl(floo(i(4, 0)), 0, 2, 4, 8, 16),
    selAl(floo(i(6, 0)), [16], [14], [11], [10], [8], [6], [4], [4]),
    rnd(61, 62),
    127);
  prorythme(score, add(16, h(ZONE2)), add(deb2, h([0, 1 / 2, 1, 1 / 4, 3 / 2])), fin2,
    gnotes(),
    selAl(floo(i(4, 0)), 0, 2, 4, 8, 16),
    selAl(floo(i(6, 0)), [16], [14], [11], [10], [8], [6], [4], [4]),
    rnd(61, 62),
    127);
  prorythme(score, add(16, h(ZONE2)), add(deb2, h([0, 1 / 2, 1, 1 / 4, 3 / 2])), fin2,
    gnotes(),
    selAl(floo(i(4, 0)), 0, 2, 4, 8, 16),
    selAl(floo(i(6, 0)), [16], [14], [11], [10], [8], [6], [4], [4]),
    rnd(61, 62),
    127);
  prorythme(score, add(16, h(ZONE2)), add(deb2, h([0, 1 / 2, 1, 1 / 4, 3 / 2])), fin2,
    gnotes(),
    selAl(floo(i(4, 0)), 0, 2, 4, 8, 16),
    selAl(floo(i(6, 0)), [16], [14], [11], [10], [8], [6], [4], [4]),
    rnd(61, 62),
    127);
  prorythme(score, add(16, h(ZONE3)), add(h([0, 1 / 2, 1, 1 / 4, 3 / 2]), floo(div(fin2, 2))), fin2,
    gnotes(),
    selAl(floo(i(4, 0)), 0, 2, 4, 8, 16),
    selAl(floo(i(6, 0)), [16], [14], [11], [10], [8], [6], [4], [4]),
    rnd(61, 62),
    127);
  prorythme(score, add(16, h(ZONE3)), add(h([0, 1 / 2, 1, 1 / 4, 3 / 2]), floo(div(fin2, 2))), fin2,
    gnotes(),
    selAl(floo(i(4, 0)), 0, 2, 4, 8, 16),
    selAl(floo(i(6, 0)), [16], [14], [11], [10], [8], [6], [4], [4]),
    rnd(61, 62),
    127);
  prorythme(score, add(16, h(ZONE3)), add(h([0, 1 / 2, 1, 1 / 4, 3 / 2]), floo(div(fin2, 2))), fin2,
    gnotes(),
    selAl(floo(i(4, 0)), 0, 2, 4, 8, 16),
    selAl(floo(i(6, 0)), [16], [14], [11], [10], [8], [6], [4], [4]),
    rnd(61, 62),
    120);
  // triangle régulier tout canaux (pitch= 30)
  prorythme(score, 0, add(deb2, 24), fin2,
    gnotes({ laccord: GACCORD, lecar: GECAR }),
    8,
    [36],
    36,
    25);
  // apparitions de rivières
  prorythme(score, 0, add(20, deb2), fin2,
    gnotes({ laccord: GACCORD, lecar: GECAR }),
    h([8, 16, 24]),
    h([[8], [16], [24], [6]]),
    rnd(126, 127),
    60);
  // voix soufflée rare (pitch= 27 ou 43)
  prorythme(score, rnd(16, 31), add(deb2, h([0, 1 / 2, 1, 1 / 4, 3 / 2])), fin2,
    gnotes(),
    selAl(3, 6, 10, 16, 20),
    [1 / 4, 1 / 4, 1 / 4],
    43,
    60);
  // voix rares tout canaux 2 fois (pitch= 30)
  prorythme(score, rnd(16, 31), add(deb2, 7), fin2,
    gnotes(),
    h([0, 8, 16, 8, 4]),
    sel(h([0, 0, 0, 0, 1]), [1 / 8], [1 / 4, 1 / 4, 1 / 4]),
    rep(rnd(21, 50), 2),
    70);
}

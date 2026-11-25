/**
 * @file Séquence 28 (4' - 6').
 *
 * Généré par `npm run transpile` (transpiler/) depuis source/Gerland2013-4.lsp.
 * Ne pas modifier à la main : corriger le transpileur, puis régénérer.
 * tests/transpile.test.js vérifie que ce fichier est à jour.
 *
 * Commentaire d'origine :
 *     Séquence 28 (4' - 6')
 *     Gouttes (cécilia) répétées et gong et voix répétées
 *     version pour 16 points       Multi M5
 *     voix soufflée rare
 *     triangle régulier tout canaux
 */

import { add, div, floo, gnotes, h, i, lst, nGnotes, nProrythme, placeTempo, prorythme, rep, rnd, sel, sub } from '../../../core/index.js';
import { once, placeProg, printDialog, selAl } from '../tools.js';
import { GACCORD, GECAR, MULTIS } from '../config.js';

/**
 * Séquence 28.
 * Traduction de `(sequence-28 deb fin)`, lignes 3817 à 4132.
 * @param {import('../../../core/score.js').Score} score Partition où écrire.
 * @param {import('../../../core/generators.js').GenLike} deb Début (noires), tiré une fois.
 * @param {import('../../../core/generators.js').GenLike} fin Fin (noires), tirée une fois.
 * @returns {void}
 */
export function sequence28(score, deb, fin) {
  printDialog(score, 'SEQUENCE 28');
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
  prorythme(score, rnd(16, 31), add(deb2, h([0, 1 / 2, 1, 1 / 4, 3 / 2])), fin2,
    gnotes(),
    selAl(floo(i(4, 0)), 0, 2, 4, 8, 16),
    selAl(floo(i(6, 0)), [16], [14], [11], [10], [8], [6], [4], [4]),
    rnd(61, 62),
    100);
  prorythme(score, rnd(16, 31), add(deb2, h([0, 1 / 2, 1, 1 / 4, 3 / 2])), fin2,
    gnotes(),
    selAl(floo(i(4, 0)), 0, 2, 4, 8, 16),
    selAl(floo(i(6, 0)), [16], [14], [11], [10], [8], [6], [4], [4]),
    rnd(61, 62),
    100);
  prorythme(score, rnd(16, 31), add(deb2, h([0, 1 / 2, 1, 1 / 4, 3 / 2])), fin2,
    gnotes(),
    selAl(floo(i(4, 0)), 0, 2, 4, 8, 16),
    selAl(floo(i(6, 0)), [16], [14], [11], [10], [8], [6], [4], [4]),
    rnd(61, 62),
    100);
  prorythme(score, rnd(16, 31), add(deb2, h([0, 1 / 2, 1, 1 / 4, 3 / 2])), fin2,
    gnotes(),
    selAl(floo(i(4, 0)), 0, 2, 4, 8, 16),
    selAl(floo(i(6, 0)), [16], [14], [11], [10], [8], [6], [4], [4]),
    rnd(61, 62),
    100);
  prorythme(score, rnd(16, 31), add(deb2, h([0, 1 / 2, 1, 1 / 4, 3 / 2])), fin2,
    gnotes(),
    selAl(floo(i(4, 0)), 0, 2, 4, 8, 16),
    selAl(floo(i(6, 0)), [16], [14], [11], [10], [8], [6], [4], [4]),
    rnd(61, 62),
    100);
  prorythme(score, rnd(16, 31), add(deb2, h([0, 1 / 2, 1, 1 / 4, 3 / 2])), fin2,
    gnotes(),
    selAl(floo(i(4, 0)), 0, 2, 4, 8, 16),
    selAl(floo(i(6, 0)), [16], [14], [11], [10], [8], [6], [4], [4]),
    rnd(61, 62),
    100);
  prorythme(score, rnd(16, 31), add(deb2, h([0, 1 / 2, 1, 1 / 4, 3 / 2])), fin2,
    gnotes(),
    selAl(floo(i(4, 0)), 0, 2, 4, 8, 16),
    selAl(floo(i(6, 0)), [16], [14], [11], [10], [8], [6], [4], [4]),
    rnd(61, 62),
    100);
  prorythme(score, rnd(16, 31), add(h([0, 1 / 2, 1, 1 / 4, 3 / 2]), floo(div(fin2, 2))), fin2,
    gnotes(),
    selAl(floo(i(4, 0)), 0, 2, 4, 8, 16),
    selAl(floo(i(6, 0)), [16], [14], [11], [10], [8], [6], [4], [4]),
    rnd(61, 62),
    100);
  prorythme(score, rnd(16, 31), add(h([0, 1 / 2, 1, 1 / 4, 3 / 2]), floo(div(fin2, 2))), fin2,
    gnotes(),
    selAl(floo(i(4, 0)), 0, 2, 4, 8, 16),
    selAl(floo(i(6, 0)), [16], [14], [11], [10], [8], [6], [4], [4]),
    rnd(61, 62),
    100);
  prorythme(score, rnd(16, 31), add(h([0, 1 / 2, 1, 1 / 4, 3 / 2]), floo(div(fin2, 2))), fin2,
    gnotes(),
    selAl(floo(i(4, 0)), 0, 2, 4, 8, 16),
    selAl(floo(i(6, 0)), [16], [14], [11], [10], [8], [6], [4], [4]),
    rnd(61, 62),
    100);
  //
  nProrythme(score, add(deb2, 60, h([1, 2, 3, 4, 5, 6, 7, 8, 10, 0, 1 / 2, 1 / 4, 1 / 8, 1 / 16])), fin2, h([1, 2, 3, 4, 0, 1 / 4, 1 / 8, 1 / 16]),
    nGnotes(16, h([[7], [8], [9], [10], [12], [14]]), 77, 100));
  nProrythme(score, add(deb2, 60, h([1, 2, 3, 4, 5, 6, 7, 8, 10, 0, 1 / 2, 1 / 4, 1 / 8, 1 / 16])), fin2, h([1, 2, 3, 4, 0, 1 / 4, 1 / 8, 1 / 16]),
    nGnotes(17, h([[7], [8], [9], [10], [12], [14]]), 77, 100));
  nProrythme(score, add(deb2, 60, 18), fin2, h([1, 2, 3, 4, 0, 1 / 4, 1 / 8, 1 / 16]),
    nGnotes(18, h([[7], [8], [9], [10], [12], [14]]), 77, 100));
  prorythme(score, 19, add(deb2, 60, h([0, 1 / 2, 1, 1 / 4, 3 / 2])), fin2,
    gnotes(),
    selAl(floo(i(4, 0)), 0, 2, 4),
    selAl(floo(i(6, 0)), [16], [14], [11], [10], [8], [6], [4], [4]),
    rnd(61, 62),
    100);
  prorythme(score, 20, add(deb2, 60, h([0, 1 / 2, 1, 1 / 4, 3 / 2])), fin2,
    gnotes(),
    selAl(floo(i(4, 0)), 0, 2, 4),
    selAl(floo(i(6, 0)), [16], [14], [11], [10], [8], [6], [4], [4]),
    rnd(61, 62),
    100);
  prorythme(score, 21, add(deb2, 60, h([0, 1 / 2, 1, 1 / 4, 3 / 2])), fin2,
    gnotes(),
    selAl(floo(i(4, 0)), 0, 2, 4),
    selAl(floo(i(6, 0)), [16], [14], [11], [10], [8], [6], [4], [4]),
    rnd(61, 62),
    100);
  prorythme(score, 22, add(deb2, 60, h([0, 1 / 2, 1, 1 / 4, 3 / 2])), fin2,
    gnotes(),
    selAl(floo(i(4, 0)), 0, 2, 4),
    selAl(floo(i(6, 0)), [16], [14], [11], [10], [8], [6], [4], [4]),
    rnd(61, 62),
    100);
  prorythme(score, 23, add(deb2, 60, h([0, 1 / 2, 1, 1 / 4, 3 / 2])), fin2,
    gnotes(),
    selAl(floo(i(4, 0)), 0, 2, 4),
    selAl(floo(i(6, 0)), [16], [14], [11], [10], [8], [6], [4], [4]),
    rnd(61, 62),
    100);
  prorythme(score, 24, add(deb2, 60, h([0, 1 / 2, 1, 1 / 4, 3 / 2])), fin2,
    gnotes(),
    selAl(floo(i(4, 0)), 0, 2, 4),
    selAl(floo(i(6, 0)), [16], [14], [11], [10], [8], [6], [4], [4]),
    rnd(61, 62),
    100);
  prorythme(score, 25, add(deb2, 60, h([0, 1 / 2, 1, 1 / 4, 3 / 2])), fin2,
    gnotes(),
    selAl(floo(i(4, 0)), 0, 2, 4),
    selAl(floo(i(6, 0)), [16], [14], [11], [10], [8], [6], [4], [4]),
    rnd(61, 62),
    100);
  prorythme(score, 26, add(60, h([0, 1 / 2, 1, 1 / 4, 3 / 2]), floo(div(fin2, 2))), fin2,
    gnotes(),
    selAl(floo(i(4, 0)), 0, 2, 4),
    selAl(floo(i(6, 0)), [16], [14], [11], [10], [8], [6], [4], [4]),
    rnd(61, 62),
    100);
  prorythme(score, 27, add(60, h([0, 1 / 2, 1, 1 / 4, 3 / 2]), floo(div(fin2, 2))), fin2,
    gnotes(),
    selAl(floo(i(4, 0)), 0, 2, 4, 8, 16),
    selAl(floo(i(6, 0)), [16], [14], [11], [10], [8], [6], [4], [4]),
    rnd(61, 62),
    100);
  prorythme(score, 28, add(60, h([0, 1 / 2, 1, 1 / 4, 3 / 2]), floo(div(fin2, 2))), fin2,
    gnotes(),
    selAl(floo(i(4, 0)), 0, 2, 4),
    selAl(floo(i(6, 0)), [16], [14], [11], [10], [8], [6], [4], [4]),
    rnd(61, 62),
    100);
  prorythme(score, 29, add(60, h([0, 1 / 2, 1, 1 / 4, 3 / 2]), floo(div(fin2, 2))), fin2,
    gnotes(),
    selAl(floo(i(4, 0)), 0, 2, 4),
    selAl(floo(i(6, 0)), [16], [14], [11], [10], [8], [6], [4], [4]),
    rnd(61, 62),
    100);
  prorythme(score, 30, add(60, h([0, 1 / 2, 1, 1 / 4, 3 / 2]), floo(div(fin2, 2))), fin2,
    gnotes(),
    selAl(floo(i(4, 0)), 0, 2, 4),
    selAl(floo(i(6, 0)), [16], [14], [11], [10], [8], [6], [4], [4]),
    rnd(61, 62),
    100);
  prorythme(score, 31, add(60, h([0, 1 / 2, 1, 1 / 4, 3 / 2]), floo(div(fin2, 2))), fin2,
    gnotes(),
    selAl(floo(i(4, 0)), 0, 2, 4),
    selAl(floo(i(6, 0)), [16], [14], [11], [10], [8], [6], [4], [4]),
    rnd(61, 62),
    100);
  //
  nProrythme(score, add(deb2, 120), fin2, floo(h([1 / 8, 1 / 16, 1 / 32])),
    nGnotes(16, h([[7], [8], [9], [10], [12], [14]]), 77, 100));
  nProrythme(score, add(deb2, 120), fin2, floo(h([1 / 8, 1 / 16, 1 / 32])),
    nGnotes(17, h([[7], [8], [9], [10], [12], [14]]), 77, 100));
  nProrythme(score, add(deb2, 100), fin2, floo(h([1 / 8, 1 / 16, 1 / 32])),
    nGnotes(18, h([[7], [8], [9], [10], [12], [14]]), 77, 100));
  prorythme(score, 19, add(deb2, 100, floo(h([1 / 8, 1 / 16, 1 / 32]))), fin2,
    gnotes(),
    floo(h([1 / 8, 1 / 16, 1 / 32])),
    selAl(floo(i(6, 0)), [16], [14], [11], [10], [8], [6], [4], [4]),
    rnd(61, 62),
    100);
  prorythme(score, 20, add(deb2, 120, h([1 / 8, 1 / 16, 1 / 32])), fin2,
    gnotes(),
    floo(h([1 / 8, 1 / 16, 1 / 32])),
    selAl(floo(i(6, 0)), [16], [14], [11], [10], [8], [6], [4], [4]),
    rnd(61, 62),
    100);
  prorythme(score, 21, add(deb2, 120, h([1 / 8, 1 / 16, 1 / 32])), fin2,
    gnotes(),
    floo(h([1 / 8, 1 / 16, 1 / 32])),
    selAl(floo(i(6, 0)), [16], [14], [11], [10], [8], [6], [4], [4]),
    rnd(61, 62),
    100);
  prorythme(score, 22, add(deb2, 120, h([1 / 8, 1 / 16, 1 / 32])), fin2,
    gnotes(),
    floo(h([1 / 8, 1 / 16, 1 / 32])),
    selAl(floo(i(6, 0)), [16], [14], [11], [10], [8], [6], [4], [4]),
    rnd(61, 62),
    100);
  prorythme(score, 23, add(deb2, 120, h([1 / 8, 1 / 16, 1 / 32])), fin2,
    gnotes(),
    floo(h([1 / 8, 1 / 16, 1 / 32])),
    selAl(floo(i(6, 0)), [16], [14], [11], [10], [8], [6], [4], [4]),
    rnd(61, 62),
    100);
  prorythme(score, 24, add(deb2, 120, h([1 / 8, 1 / 16, 1 / 32])), fin2,
    gnotes(),
    floo(h([1 / 8, 1 / 16, 1 / 32])),
    selAl(floo(i(6, 0)), [16], [14], [11], [10], [8], [6], [4], [4]),
    rnd(61, 62),
    100);
  prorythme(score, 25, add(deb2, 120, h([1 / 8, 1 / 16, 1 / 32])), fin2,
    gnotes(),
    h([0, 1 / 3, 1 / 2, 1, 2]),
    selAl(floo(i(6, 0)), [16], [14], [11], [10], [8], [6], [4], [4]),
    rnd(61, 62),
    100);
  prorythme(score, 26, add(deb2, 120, h([1 / 8, 1 / 16, 1 / 32]), floo(div(fin2, 2))), fin2,
    gnotes(),
    floo(h([1 / 8, 1 / 16, 1 / 32])),
    selAl(floo(i(6, 0)), [16], [14], [11], [10], [8], [6], [4], [4]),
    rnd(61, 62),
    100);
  prorythme(score, 27, add(deb2, 120, h([1 / 8, 1 / 16, 1 / 32]), floo(div(fin2, 2))), fin2,
    gnotes(),
    floo(h([1 / 8, 1 / 16, 1 / 32])),
    selAl(floo(i(6, 0)), [16], [14], [11], [10], [8], [6], [4], [4]),
    rnd(61, 62),
    100);
  prorythme(score, 28, add(deb2, 120, h([1 / 8, 1 / 16, 1 / 32]), floo(div(fin2, 2))), fin2,
    gnotes(),
    floo(h([1 / 8, 1 / 16, 1 / 32])),
    selAl(floo(i(6, 0)), [16], [14], [11], [10], [8], [6], [4], [4]),
    rnd(61, 62),
    100);
  prorythme(score, 29, add(deb2, 120, h([1 / 8, 1 / 16, 1 / 32]), floo(div(fin2, 2))), fin2,
    gnotes(),
    floo(h([1 / 8, 1 / 16, 1 / 32])),
    selAl(floo(i(6, 0)), [16], [14], [11], [10], [8], [6], [4], [4]),
    rnd(61, 62),
    100);
  prorythme(score, 30, add(deb2, 120, h([1 / 8, 1 / 16, 1 / 32]), floo(div(fin2, 2))), fin2,
    gnotes(),
    floo(h([1 / 8, 1 / 16, 1 / 32])),
    selAl(floo(i(6, 0)), [16], [14], [11], [10], [8], [6], [4], [4]),
    rnd(61, 62),
    100);
  prorythme(score, 31, add(120, deb2, h([1 / 8, 1 / 16, 1 / 32]), floo(div(fin2, 2))), fin2,
    gnotes(),
    floo(h([1 / 8, 1 / 16, 1 / 32])),
    selAl(floo(i(6, 0)), [16], [14], [11], [10], [8], [6], [4], [4]),
    rnd(61, 62),
    100);
  // rivière
  prorythme(score, 0, add(deb2, 120), fin2,
    gnotes({ laccord: GACCORD, lecar: GECAR }),
    0,
    lst(sub(fin2, 120, deb2)),
    126,
    127);
  // voix soufflée rare (pitch= 27 ou 43)
  prorythme(score, rep(rnd(16, 31), 3), add(deb2, h([0, 1 / 2, 1, 1 / 4, 3 / 2])), fin2,
    gnotes({ proba: h([0, 1]) }),
    selAl(5, 0, 1, 2, 4, 8, 16),
    sel(h([0, 1]), [1 / 4, 1 / 4, 1 / 4], [1 / 4, -1 / 4, -1 / 4]),
    h([43, 27]),
    40);
  // triangle régulier tout canaux (pitch= 30)
  prorythme(score, 0, add(deb2, 24), fin2,
    gnotes({ laccord: GACCORD, lecar: GECAR }),
    8,
    [36],
    36,
    40);
  // apparitions de rivières
  prorythme(score, 0, add(20, deb2), fin2,
    gnotes({ laccord: GACCORD, lecar: GECAR }),
    h([8, 16, 24]),
    h([[8], [16], [24], [6]]),
    rnd(126, 127),
    50);
  // voix rares tout canaux 2 fois (pitch= 30)
  prorythme(score, rnd(16, 31), add(deb2, 7), fin2,
    gnotes(),
    h([0, 8, 16, 8, 4]),
    [1 / 8],
    rep(rnd(21, 50), 2),
    40);
}

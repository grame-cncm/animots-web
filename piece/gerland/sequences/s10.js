/**
 * @file Séquence 10 (4' - 8').
 *
 * Généré par `npm run transpile` (transpiler/) depuis source/Gerland2013-4.lsp.
 * Ne pas modifier à la main : corriger le transpileur, puis régénérer.
 * tests/transpile.test.js vérifie que ce fichier est à jour.
 *
 * Commentaire d'origine :
 *     Séquence 10 (4' - 8')
 *     Voix principales
 *     version pour 16 points groupés         Multi M7
 *     avec phrase de voix + percu et/ou oiseaux, éclatée sur des groupes d'enceintes.
 *     avec oiseaux rares
 *     avec voix rares
 */

import { add, concat, freeGen, gnotes, h, lst, mem, nconcat, nGnotes, nProrythme, placeTempo, prorythme, rep, rnd, s, shareGen, useGen } from '../../../core/index.js';
import { groupe, once, placeProg, printDialog, selAl } from '../tools.js';
import { listgroupe, MULTIS } from '../config.js';

/**
 * Séquence 10.
 * Traduction de `(sequence-10 deb fin)`, lignes 1772 à 1857.
 * @param {import('../../../core/score.js').Score} score Partition où écrire.
 * @param {import('../../../core/generators.js').GenLike} deb Début (noires), tiré une fois.
 * @param {import('../../../core/generators.js').GenLike} fin Fin (noires), tirée une fois.
 * @returns {void}
 */
export function sequence10(score, deb, fin) {
  printDialog(score, 'SEQUENCE 10');
  // prog-change
  placeProg(score, 0, MULTIS.m7);
  placeTempo(score, 0, 60);
  const deb2 = once(deb);
  const fin2 = once(fin);
  // phrase de voix + percu et/ou oiseaux, éclatée sur des groupes d'enceintes.
  shareGen('n1', h([12, 13, 14, 15, 16, 17, 18, 20, 28]));
  // nbre de sons par groupe d'enceinte
  // voix + percu
  // voix + percu ou oiseau
  // voix + oiseaux/insectes
  // voix + percu et oiseau mélangés
  // un seul son voix + percu synchro sur toutes les enceintes
  nProrythme(score, deb2, fin2, h([0, 1, 2, 3, 4, 5]),
    selAl(
      4,
      nGnotes(
        s(groupe(listgroupe(), add(1, useGen('n1')), h([3, 4, 5, 6]))),
        concat(
          nconcat(
            useGen('n1'),
            h([[1 / 8], [1 / 8], [1 / 8], [1 / 8], [1 / 8], [1 / 8], [1 / 8], [1 / 8], [-1 / 2]])),
          [3 / 4]),
        mem(rnd(21, 50), h([4, 3, 2]), 5),
        80,
        { laccord: [0, -16], lecar: lst(0, rep(h([48, 75]), add(1, useGen('n1')))) }),
      nGnotes(
        s(groupe(listgroupe(), add(1, useGen('n1')), h([3, 4, 5, 6]))),
        concat(
          nconcat(
            useGen('n1'),
            h([[1 / 4], [1 / 4], [1 / 4], [1 / 4], [1 / 4], [1 / 4], [1 / 4], [1 / 4], [-1 / 2]])),
          [3 / 4]),
        mem(rnd(21, 50), h([4, 3, 2]), 5),
        80,
        { laccord: lst(0, rep(h([0, -16]), add(1, useGen('n1')))), lecar: lst(0, rep(h([48, 75]), add(1, useGen('n1')))) }),
      nGnotes(
        s(groupe(listgroupe(), add(1, useGen('n1')), h([3, 4, 5, 6]))),
        concat(
          nconcat(
            useGen('n1'),
            h([[1 / 2], [1 / 2], [1 / 2], [1 / 2], [1 / 2], [1 / 2], [1 / 2], [1 / 4], [-1 / 2]])),
          [3 / 4]),
        mem(rnd(21, 50), h([4, 3, 2]), 5),
        80,
        { laccord: [0, 0], lecar: lst(0, rep(h([48, 75]), add(1, useGen('n1')))) }),
      nGnotes(
        s(groupe(listgroupe(), add(1, useGen('n1')), h([3, 4, 5, 6]))),
        concat(
          nconcat(
            useGen('n1'),
            h([[1 / 4], [1 / 4], [1 / 4], [1 / 4], [1 / 4], [1 / 4], [1 / 4], [1 / 4], [-1 / 2]])),
          [3 / 4]),
        mem(rnd(21, 50), h([4, 3, 2]), 5),
        80,
        { laccord: lst(0, h([0, -16])), lecar: lst(0, h([48, 75])) }),
      nGnotes(
        0,
        selAl(3, [1 / 4], [1 / 2], [3], [5]),
        rnd(21, 50),
        50,
        { laccord: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31], lecar: [48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] })));
  freeGen('n1');
  // voix rares aléatoires
  prorythme(score, rnd(16, 31), add(deb2, h([0, 1, 2, 4, 6, 7, 8, 10])), fin2,
    gnotes(),
    h([4, 4, 6, 8, 12]),
    selAl(5, [1 / 4], [1 / 2], [1], [3 / 2], [3], [5]),
    rnd(21, 50),
    rep(h([70, 80, 90, 60]), s([1, 2, 3, 4])));
  // voix rares aléatoires répétées
  prorythme(score, rep(rnd(16, 31), s([1, 2, 3, 4])), add(deb2, h([0, 1, 2, 4, 6, 7, 8, 10])), fin2,
    gnotes(),
    h([4, 4, 6, 8, 12]),
    [1 / 2],
    rep(rnd(21, 50), s([1, 2, 3, 4])),
    rep(h([70, 80, 90, 60]), s([1, 2, 3, 4])));
  // oiseaux rares aléatoires
  prorythme(score, rnd(16, 31), add(deb2, h([0, 1, 2, 4, 6, 7, 8, 10])), fin2,
    gnotes(),
    h([4, 4, 6, 8, 12]),
    selAl(5, [1 / 4], [1 / 2], [1], [3 / 2], [3], [5]),
    rnd(69, 125),
    h([100, 110, 90, 80]));
}

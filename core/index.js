/**
 * @file Point d'entrée du noyau CLCE/Prorythme en JavaScript.
 *
 * Le noyau ne dépend ni du DOM ni de Node : il tourne dans le navigateur comme sous Node.
 *
 * - `lisp.js` : sémantique Common Lisp (round, mod, elt, NIL...) ;
 * - `random.js` : aléa reproductible (`random`, `seed`) ;
 * - `generators.js` : générateurs temporels (1-TimeGenerators.lisp) ;
 * - `paj.js` : générateurs PAJ utilisés (`selAl`, flux partagés) ;
 * - `rhythm.js` : rythmes symboliques et générateurs de rythmes ;
 * - `score.js` : partition MIDI et curseur d'écriture ;
 * - `prorythme.js` : processus prorythme, gnotes, n-prorythme, n-gnotes.
 */
export * from './lisp.js';
export * from './random.js';
export * from './generators.js';
export * from './paj.js';
export * from './rhythm.js';
export * from './score.js';
export * from './prorythme.js';

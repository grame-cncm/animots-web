/**
 * @file Générateurs de P.-A. Jaffrennou utilisés par Gerland.
 *
 * Portage partiel de CLCE `4-Prorythme/2GenerateursPAJ.lisp`. Les autres générateurs de ce
 * fichier (gauss, triangle, gmode, gmodalea, passe, passep, passip, prob01, gsom, reduit-g,
 * reduit-d, augmente-g, augmente-d...) ne sont pas portés : Gerland2013-4.lsp ne les appelle pas.
 */

import { elt } from './lisp.js';
import { lift } from './generators.js';
import { random } from './random.js';

/**
 * `(sel-al g1 g...)`, version de la BIBLIOTHÈQUE : évalue l'alternative d'indice
 * `(random (1+ g1))`. Déborde dès que g1 est supérieur ou égal au nombre d'alternatives : c'est
 * l'erreur « index 4 out of range » de ReadMe.rtf. Gerland2013-4.lsp la redéfinit en bornant
 * l'indice : pour Gerland, utiliser `selAl` de `piece/gerland/tools.js`.
 * @param {import('./generators.js').GenLike} g1 Indice maximal tiré.
 * @param {...import('./generators.js').GenLike} lg Alternatives.
 * @returns {import('./generators.js').Gen}
 * @throws {RangeError} À l'appel, si l'indice tiré sort des alternatives.
 */
export const selAl = (g1, ...lg) => {
  g1 = lift(g1); lg = lg.map(lift);
  return (c) => elt(lg, random(1 + g1(c)))(c);
};

/**
 * Flux de valeurs partagés : `share-gen`, `use-gen` et `free-gen` (Letz, 4 juillet 2006).
 *
 * Un nom est associé à un générateur. Chaque lecteur (`use-gen`) a son propre indice : le k-ième
 * appel de chaque lecteur rend la k-ième valeur produite. Le générateur n'est évalué que lorsqu'un
 * lecteur dépasse les valeurs déjà produites. Plusieurs paramètres (rythme, hauteur, vélocité),
 * ou plusieurs processus, peuvent ainsi suivre la même suite de tirages, par exemple un nombre
 * de répétitions commun.
 *
 * Comme en Lisp, où ces macros utilisent la liste de propriétés du symbole, le générateur et les
 * valeurs sont cherchés par NOM à chaque appel. `share` ne vide pas les valeurs déjà produites :
 * seul `free` le fait.
 */
export class SharedGenerators {
  /** @type {Map<string, {generator: (import('./generators.js').Gen|undefined), values: Array<any>}>} */
  #slots = new Map();

  /**
   * Emplacement d'un nom, créé vide au besoin.
   * @param {string} name
   * @returns {{generator: (import('./generators.js').Gen|undefined), values: Array<any>}}
   */
  #slot(name) {
    let sl = this.#slots.get(name);
    if (!sl) { sl = { generator: undefined, values: [] }; this.#slots.set(name, sl); }
    return sl;
  }

  /**
   * `(share-gen name g)` : associe le générateur au nom.
   * @param {string} name
   * @param {import('./generators.js').GenLike} g
   * @returns {import('./generators.js').Gen} Le générateur, comme la macro Lisp.
   */
  share(name, g) { const sl = this.#slot(name); sl.generator = lift(g); return sl.generator; }

  /**
   * `(use-gen name)` : crée un nouveau lecteur du flux, à partir de sa première valeur.
   * @param {string} name
   * @returns {import('./generators.js').Gen}
   * @throws {TypeError} À l'appel, si aucun générateur n'est associé au nom.
   * @throws {RangeError} À l'appel, si le lecteur sert encore après `free` (erreur d'indice en Lisp).
   */
  use(name) {
    let k = 0;
    return (c) => {
      const sl = this.#slot(name);
      if (k >= sl.values.length) {
        if (!sl.generator) throw new TypeError(`use-gen: no generator shared under ${String(name)}`);
        sl.values.push(sl.generator(c));
      }
      k++;
      if (sl.values.length - k < 0) {
        throw new RangeError(`use-gen ${String(name)}: reader used after free-gen`);
      }
      return sl.values[k - 1];
    };
  }

  /**
   * `(free-gen name)` : oublie les valeurs produites ; le générateur reste associé au nom.
   * @param {string} name
   * @returns {void}
   */
  free(name) { this.#slot(name).values = []; }

  /**
   * Oublie tous les noms (nouvelle exécution).
   * @returns {void}
   */
  reset() { this.#slots.clear(); }
}

/** Registre global, équivalent des listes de propriétés des symboles Lisp. */
export const sharedGenerators = new SharedGenerators();

/**
 * `(share-gen name g)` sur le registre global.
 * @param {string} name
 * @param {import('./generators.js').GenLike} g
 * @returns {import('./generators.js').Gen}
 */
export const shareGen = (name, g) => sharedGenerators.share(name, g);

/**
 * `(use-gen name)` sur le registre global.
 * @param {string} name
 * @returns {import('./generators.js').Gen}
 */
export const useGen = (name) => sharedGenerators.use(name);

/**
 * `(free-gen name)` sur le registre global.
 * @param {string} name
 * @returns {void}
 */
export const freeGen = (name) => sharedGenerators.free(name);

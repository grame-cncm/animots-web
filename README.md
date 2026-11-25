# animots-web

Portage en JavaScript d'**Animots**, l'installation sonore du Parc de Gerland (2013) : le langage de composition CLCE/Prorythme et les 36 séquences de `Gerland2013-4.lsp`, avec une sortie MIDI vers Kontakt 8. L'analyse et le plan complet sont dans [`../Animots-Gerland-JS-analyse-et-plan.md`](../Animots-Gerland-JS-analyse-et-plan.md).

## État

| Phase | Contenu | État |
|---|---|---|
| 1 | Noyau des générateurs, rythmes, outils et données de Gerland, tests | **fait** |
| 2 | `prorythme`, `gnotes`, `n-prorythme`, `n-gnotes`, partition, export `.mid`, séquences 2 et 3 | **fait** (134 tests en tout) |
| 3 | Traduction des 34 autres séquences et des 6 tests | à faire |
| 4 | Validation de fidélité (statistiques, écoute) | à faire |
| 5 | Lecteur Web MIDI et interface | à faire |
| 6 | Exploitation continue (kiosque ou Node) | à faire |

## Lancer les tests

Il faut Node 20 ou plus récent. Le projet n'a aucune dépendance.

```bash
npm test
```

## Exporter une séquence en fichier MIDI

```bash
npm run export:mid -- 3 2013
```

Les arguments sont le numéro de la séquence, la graine de l'aléa (2013 par défaut) et, en option, la durée en noires. Sans durée, elle est tirée comme dans `g-parties`. Le fichier `out/sequence-3-2013.mid` est au format 1, avec une piste par port (A et B, méta-événement « MIDI port ») à 5 040 ticks par noire. Le script affiche un résumé : durée, notes par canal, plage des hauteurs. Pour l'instant, seules les séquences 2 et 3 sont traduites.

Le prototype `../animots-js-poc/` est dépassé : il évaluait mal les silences, en leur passant des constantes au lieu de la hauteur et de la vélocité.

## Organisation

```text
core/                     noyau sans DOM : navigateur et Node
  lisp.js                 sémantique Common Lisp : round au pair, mod, elt, NIL, opérateurs variadiques
  random.js               aléa reproductible : random(n), seed, état mémorisable
  generators.js           générateurs temporels (portage complet de 1-TimeGenerators.lisp)
  paj.js                  sel-al de la bibliothèque, flux partagés share-gen / use-gen / free-gen
  rhythm.js               rythmes symboliques, n-olets, liaisons, ticks à 5 040 par noire, concat...
  score.js                partition : événements datés, curseur (p-abs, p-rel), écriture des notes (NOTES), messages MIDI triés
  prorythme.js            prorythme, gnotes, n-prorythme, n-gnotes, place-tempo
  index.js                réexporte tout le noyau
piece/gerland/
  tools.js                outils définis dans Gerland2013-4.lsp (xconcat, sel-al corrigé, traj, groupe, place-prog...)
  config.js               multis, zones, trajectoires, liste pondérée et durées des parties
  sequences.js            séquences traduites (2 et 3 pour l'instant)
output/
  smf.js                  export en fichier MIDI standard, et relecture pour vérification
scripts/
  export-mid.js           calcule une séquence et l'exporte en .mid
tests/                    tests node:test, dont un test qui impose la documentation du code
out/                      fichiers .mid produits (peut être effacé)
```

## Conventions

**Générateurs.** Un générateur CLCE `#'(lambda (stime ctime etime reverse) ...)` devient une fonction `(ctx) => valeur`, avec `ctx = { stime, ctime, etime, reverse }`. Toute valeur qui n'est pas une fonction, passée en argument, devient un générateur constant : `h([90, 80, 70])` s'écrit comme `(h °(90 80 70))`. Une fonction passée comme valeur (`°+`) s'enveloppe dans `G(...)`.

**Fidélité.** Le comportement de référence est celui du code Lisp exécuté, pas celui de ses commentaires. Les arguments sont évalués dans l'ordre du Lisp, car les générateurs à état (`rep`, `s`, `hs`, `alt`, `mem`, `use-gen`) en dépendent. Quand une docstring indique un ordre d'évaluation, un test le vérifie. Arrondis, modulos et erreurs d'indice suivent Common Lisp (`core/lisp.js`).

**Durées.** Les durées sont en noires, en flottants. Elles ne passent en ticks entiers (5 040 par noire, la valeur `noi` de CLCE) que par `ticks()`, qui absorbe l'erreur d'arrondi : `ticks(1/3)` vaut 1680, comme en Lisp.

**Processus.** `prorythme` et `nProrythme` écrivent dans la partition qu'on leur passe ; pendant leur exécution, c'est la partition active (`*out*` en Lisp) où écrivent `gnotes` et `nGnotes`. L'ordre et le nombre d'évaluations par élément sont ceux de `evenement` et `n-evenement`. En particulier, `laccord` est évalué deux fois dans `gnotes`, et les silences évaluent eux aussi la hauteur et la vélocité. La docstring de `core/prorythme.js` en donne le tableau, et `tests/prorythme.test.js` le vérifie avec des générateurs espions.

**Hasard.** `seed(n)` rend tout déterministe. Les tirages ne reproduisent pas ceux de LispWorks, ce qui est impossible ; seule la loi de probabilité est la même.

**Documentation.** Chaque fichier commence par un bloc `@file`. Chaque symbole exporté a un bloc JSDoc qui donne l'équivalent Lisp, les paramètres, la valeur rendue et, quand le Lisp en donne un, un exemple. `tests/documentation.test.js` fait échouer la suite si un export n'est pas documenté.

## Ce qui n'est pas porté

- Dans `2GenerateursPAJ.lisp` : gauss, triangle, gmode, passe, passep et les autres générateurs que Gerland n'appelle pas.
- Dans `7Rythmes.lisp` : `fusion` et `nfusion`.
- La sortie partition Finale/ENIGMA, et les paramètres de `gnotes` et `n-gnotes` autres que `stac`, `proba`, `laccord` et `lecar` : `sil`, trilles, appoggiatures, glissandi, arpèges, transpositions, contrôleurs, accelerando, `pgchange`. Gerland ne les utilise pas ; les fournir provoque une erreur explicite. Les hauteurs fractionnaires, elles, sont gérées par pitch-bend.

## Écarts connus avec le Lisp

- **Rationnels.** Le Lisp calcule en rationnels exacts, le port en flottants. Les durées restent exactes au tick près grâce à `ticks()`.
- **Liste nue dans un rythme.** Une liste qui ne suit pas un symbole de n-olet (`((1 2) 3)`) provoque une erreur ici. En Lisp, elle passait sans erreur mais donnait une durée incohérente.
- **Pitch-bend.** CLCE envoie un pitch-bend avant chaque note. Le port ne garde que ceux qui changent la valeur du canal, dans l'ordre du temps, ce qui a le même effet. Une note de vélocité 0 n'envoie pas le sien.
- **Durée d'une partie.** C'est la fin de la dernière note (`score.end`), notes muettes comprises. Le `msh-seq-all-duration` d'origine n'est pas dans les sources disponibles.
- **`seq` en temps renversé.** À `ctime = etime`, `seq` rend NIL au lieu de l'erreur de `nth -1` du Lisp.

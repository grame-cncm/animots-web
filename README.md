# animots-web

Portage en JavaScript d'**Animots**, l'installation sonore du Parc de Gerland (2013) : le langage de composition CLCE/Prorythme et les 36 séquences de `Gerland2013-4.lsp`, avec une sortie MIDI vers Kontakt 8. L'analyse et le plan complet sont dans [`../Animots-Gerland-JS-analyse-et-plan.md`](../Animots-Gerland-JS-analyse-et-plan.md).

## État

| Phase | Contenu | État |
|---|---|---|
| 1 | Noyau des générateurs, rythmes, outils et données de Gerland, tests | **fait** |
| 2 | `prorythme`, `gnotes`, `n-prorythme`, `n-gnotes`, partition, export `.mid` | **fait** |
| 3 | Transpileur, 36 séquences et 6 essais générés, enchaînement des parties | **fait** (186 tests en tout) |
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

Les arguments sont le numéro de la séquence (1 à 36) ou le nom d'un essai (`cercle1`, `cercle2`, `tutti`, `alterne`, `essai`, `essai1bis`), la graine de l'aléa (2013 par défaut) et, en option, la durée en noires. Sans durée, elle est tirée comme dans `g-parties`. Le fichier `out/sequence-3-2013.mid` est au format 1, avec une piste par port (A et B, méta-événement « MIDI port ») à 5 040 ticks par noire. Le script affiche un résumé : durée, notes par canal, plage des hauteurs.

Le prototype `../animots-js-poc/` est dépassé : il évaluait mal les silences, en leur passant des constantes au lieu de la hauteur et de la vélocité.

## Régénérer les séquences

Les séquences JavaScript sont **générées** depuis le source Lisp d'origine, copié sans modification dans `source/Gerland2013-4.lsp` :

```bash
npm run transpile            # réécrit piece/gerland/sequences/
npm run transpile -- --check # vérifie seulement qu'ils sont à jour
```

On ne modifie pas les fichiers générés à la main : on corrige le transpileur (`transpiler/`), puis on régénère. `tests/transpile.test.js` échoue si un fichier généré n'est plus à jour. Le transpileur refuse, en citant la ligne du source, toute forme, tout symbole ou tout littéral qu'il ne connaît pas.

Trois vérifications portent sur la traduction elle-même :

- Les séquences 2 et 3 générées produisent exactement la même partition, graine par graine, que leur traduction manuelle (`tests/oracle-sequences.js`), écrite indépendamment en phase 2.
- Chaque séquence a autant de `prorythme` et de `n-prorythme` que dans le Lisp.
- Chaque séquence tourne sur 50 graines sans erreur et envoie le CC9 du multi indiqué dans le source.

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
  parties.js              g-parties : silence de 25 s et séquence tirée au sort, en alternance ; calcul-partie
  sequences/              GÉNÉRÉ : s01.js à s36.js, essais.js, index.js (tables SEQUENCES et ESSAIS)
source/
  Gerland2013-4.lsp       source Lisp d'origine (ISO-8859-1, fins de ligne CR), non modifié
transpiler/
  reader.js               lecteur Lisp qui garde commentaires et numéros de ligne
  emit.js                 traduction des séquences et des essais en JavaScript
  generate.js             production des fichiers de piece/gerland/sequences/
output/
  smf.js                  export en fichier MIDI standard, et relecture pour vérification
scripts/
  export-mid.js           calcule une séquence ou un essai et l'exporte en .mid
  transpile.js            régénère les séquences depuis source/ (--check : vérifie seulement)
tests/                    tests node:test, dont un test qui impose la documentation du code
  oracle-sequences.js     séquences 2 et 3 traduites à la main, référence du transpileur
out/                      fichiers .mid produits (peut être effacé)
```

## Conventions

**Générateurs.** Un générateur CLCE `#'(lambda (stime ctime etime reverse) ...)` devient une fonction `(ctx) => valeur`, avec `ctx = { stime, ctime, etime, reverse }`. Toute valeur qui n'est pas une fonction, passée en argument, devient un générateur constant : `h([90, 80, 70])` s'écrit comme `(h °(90 80 70))`. Une fonction passée comme valeur (`°+`) s'enveloppe dans `G(...)`.

**Fidélité.** Le comportement de référence est celui du code Lisp exécuté, pas celui de ses commentaires. Les arguments sont évalués dans l'ordre du Lisp, car les générateurs à état (`rep`, `s`, `hs`, `alt`, `mem`, `use-gen`) en dépendent. Quand une docstring indique un ordre d'évaluation, un test le vérifie. Arrondis, modulos et erreurs d'indice suivent Common Lisp (`core/lisp.js`).

**Durées.** Les durées sont en noires, en flottants. Elles ne passent en ticks entiers (5 040 par noire, la valeur `noi` de CLCE) que par `ticks()`, qui absorbe l'erreur d'arrondi : `ticks(1/3)` vaut 1680, comme en Lisp.

**Processus.** `prorythme` et `nProrythme` écrivent dans la partition qu'on leur passe ; pendant leur exécution, c'est la partition active (`*out*` en Lisp) où écrivent `gnotes` et `nGnotes`. L'ordre et le nombre d'évaluations par élément sont ceux de `evenement` et `n-evenement`. En particulier, `laccord` est évalué deux fois dans `gnotes`, et les silences évaluent eux aussi la hauteur et la vélocité. La docstring de `core/prorythme.js` en donne le tableau, et `tests/prorythme.test.js` le vérifie avec des générateurs espions.

**Hasard.** `seed(n)` rend tout déterministe. Les tirages ne reproduisent pas ceux de LispWorks, ce qui est impossible ; seule la loi de probabilité est la même.

**Documentation.** Chaque fichier commence par un bloc `@file`. Chaque symbole exporté a un bloc JSDoc qui donne l'équivalent Lisp, les paramètres, la valeur rendue et, quand le Lisp en donne un, un exemple. `tests/documentation.test.js` fait échouer la suite si un export n'est pas documenté.

## Anomalies du source Lisp

Le portage reproduit le comportement de 2013, y compris ces anomalies probables. Les corriger ou non est une décision de restauration ; voir le document d'analyse, section 9.

| Séquence | Ce que fait le Lisp | Intention probable |
|---|---|---|
| 4 (ligne 1135) | Un accent grave devant `(share-gen n1 …)` empêche son exécution ; la zone 3 relit le générateur de la zone 2, identique : pas d'effet audible | `share-gen` normal |
| 5 | Les phrases des « zones 2 et 3 » utilisent `*zone1*` et des bornes fixes `°0 °96` au lieu de `deb2 fin2` | zones 2 et 3, toute la séquence |
| 6 | La seconde alternative du `sel` des castagnettes des zones 2 et 3 utilise `*zone1*` | zones 2 et 3 |
| 11 | « Triangles graves multicanal répétés par zone » : `(sel … (h *zone1*) (h *zone2*) (h *zone2*))`, la zone 3 n'est jamais choisie | `*zone3*` en dernier |
| 20 (ligne 3203) | `(sel (rnd °0 °3) …)` reçoit en arguments deux trajectoires complètes (ports A et B) : une fonction évalue tous ses arguments, donc **les deux** jouent | tirer l'une des deux |
| 21 | Un `laccord` jusqu'à +14 sur des canaux du port B donne des super-canaux de 32 à 45, donc le port C, sans instrument dans le multi de 2013 : ces notes étaient muettes | rester sur le port B |

## Ce qui n'est pas porté

- Dans `2GenerateursPAJ.lisp` : gauss, triangle, gmode, passe, passep et les autres générateurs que Gerland n'appelle pas.
- Dans `7Rythmes.lisp` : `fusion` et `nfusion`.
- La sortie partition Finale/ENIGMA, et les paramètres de `gnotes` et `n-gnotes` autres que `stac`, `proba`, `laccord` et `lecar` : `sil`, trilles, appoggiatures, glissandi, arpèges, transpositions, contrôleurs, accelerando, `pgchange`. Gerland ne les utilise pas ; les fournir provoque une erreur explicite. Les hauteurs fractionnaires, elles, sont gérées par pitch-bend.

## Écarts connus avec le Lisp

- **Rationnels.** Le Lisp calcule en rationnels exacts, le port en flottants. Les durées restent exactes au tick près grâce à `ticks()`.
- **Liste nue dans un rythme.** Une liste qui ne suit pas un symbole de n-olet (`((1 2) 3)`) provoque une erreur ici. En Lisp, elle passait sans erreur mais donnait une durée incohérente.
- **Pitch-bend.** CLCE envoie un pitch-bend avant chaque note. Le port ne garde que ceux qui changent la valeur du canal, dans l'ordre du temps, ce qui a le même effet. Une note de vélocité 0 n'envoie pas le sien.
- **Durée d'une partie.** C'est la fin de la dernière note (`score.end`), notes muettes comprises. Les notes en « long staccato » (`stac` de 3 à 8) peuvent résonner au-delà de la fin tirée, comme dans le Lisp. Le `msh-seq-all-duration` d'origine, qui fixait l'enchaînement, n'est pas dans les sources disponibles.
- **`seq` en temps renversé.** À `ctime = etime`, `seq` rend NIL au lieu de l'erreur de `nth -1` du Lisp.

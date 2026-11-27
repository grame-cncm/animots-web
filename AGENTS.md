# Consignes pour les agents

Ce fichier s'adresse aux agents de programmation (Claude Code, Codex…) qui travaillent dans ce dépôt. Le [README](README.md) reste la référence pour le projet lui-même : ce qu'il fait, son état, son organisation et ses conventions. Ici ne figurent que les règles de travail et les pièges déjà rencontrés.

## Le projet en deux phrases

animots-web porte en JavaScript **Animots**, l'installation sonore du Parc de Gerland (2013) : le langage CLCE/Prorythme et les 36 séquences de `source/Gerland2013-4.lsp`. Le résultat joue vers Kontakt 8 par MIDI (page web ou exécuteur Node), ou par un échantillonneur intégré, RustySynth en WebAssembly, encore à l'état de prototype.

L'analyse et le plan complets sont hors du dépôt : `../Animots-Gerland-JS-analyse-et-plan.md`.

## Commandes

| Commande | Usage |
|---|---|
| `npm test` | toute la suite (Node 20 ou plus). Elle doit passer avant chaque commit. |
| `make help` | liste des raccourcis : `web`, `web-auto`, `echantillonneur`, `muet`, `rustysynth` |
| `npm run transpile` | régénère les séquences depuis `source/` ; `--check` vérifie seulement |
| `npm run check:lisp` | compare au Lisp d'origine exécuté dans SBCL (sauté sans SBCL) |
| `node scripts/headless.js --simule --graine 2013 --duree 60` | joue l'installation sans MIDI ni son |
| `node scripts/build-pages.js <dossier>` | construit le site GitHub Pages en local (toutes les versions figées) |

## Règles

1. **Langue.** La documentation, les commentaires, les messages du journal, les commits et les échanges sont en français. Les identifiants du code suivent l'existant.
2. **Fidélité au Lisp.** La référence est le comportement du code Lisp exécuté, pas ses commentaires. Les anomalies du source sont reproduites (README, « Anomalies du source Lisp ») : les corriger est une décision de restauration, à demander, jamais à prendre seul.
3. **Fichiers générés.** `piece/gerland/sequences/` est produit par le transpileur. On ne le modifie jamais à la main : on corrige `transpiler/`, puis on lance `npm run transpile`. `tests/transpile.test.js` vérifie que ces fichiers sont à jour.
4. **Documentation imposée.** Chaque fichier `.js` commence par un bloc `@file`. Chaque export a un bloc JSDoc, avec des `@param` quand il prend des paramètres. `tests/documentation.test.js` fait échouer la suite sinon.
5. **Tests.** Toute la suite doit passer avant de valider un commit. Il faut vérifier la ligne `# fail 0` elle-même : une chaîne `npm test | grep … && git commit` valide même quand un test échoue. Une correction de bogue s'accompagne d'un test qui échoue sans elle.
6. **Fichiers copiés de RustySynth.** `output/rustysynth/` (le `.wasm`, le worklet et `LICENSE.txt`) est une copie construite depuis le sous-module `vendor/rustysynth` (branche `wasm` de `sletz/rustysynth`). On ne la modifie jamais ici : on modifie le sous-module, puis on lance `make rustysynth`. Les copies restent dans le dépôt, parce que le workflow Pages n'a ni Rust ni les sous-modules.
7. **Ne rien publier sans accord.** Pas de `git push`, pas d'étiquette poussée, pas de publication sans que l'utilisateur l'ait demandé explicitement. Une version figée (`vX.Y`) suit la procédure du README : les adresses par défaut du superviseur et de `deploy/` pointent vers elle, et le README la liste.
8. **Pas de son sans accord.** Ne pas faire sortir de son des haut-parleurs de la machine. Pour essayer : `--simule`, `--muet`, `make muet`, ou une sortie muette (`sinkId: { type: 'none' }`).
9. **SoundFont et échantillons hors du dépôt.** `gerland.sf2` (100 Mo) et les échantillons du multi Kontakt n'entrent pas dans le dépôt, qui est public : leurs droits de diffusion ne sont pas établis. On les désigne par un chemin (`SF2=…`, `?sf2=…`), et `out/` (ignoré par git) sert aux liens temporaires.
10. **La page fonctionne hors ligne.** Rien n'est chargé depuis le réseau (ni police, ni bibliothèque). Un fichier ajouté sous `ui/`, `core/`, `output/` ou `piece/` est mis en cache par le service worker. Les fichiers propres à Node vont dans `NOT_CACHED` (`scripts/build-pages.js`). Les identifiants de `ui/index.html` sont utilisés par `ui/app.js` et par le superviseur (`window.animotsDiagnostic`).
11. **Git.** On ne valide que ses propres fichiers, nommés un par un, quand d'autres sessions peuvent travailler dans le même dossier. Les messages de commit expliquent le pourquoi, en français.
12. **Historique linéaire sur `main`.** `main` n'a aucun commit de fusion (voir la section suivante).

## Historique de `main` : linéaire

`main` suit un historique linéaire : une seule suite de commits, sans aucun commit de fusion. Pour y intégrer le travail d'une branche :

```bash
git switch ma-branche
git rebase main                # rejoue les commits de la branche à la suite de main
npm test                       # la suite doit passer (# fail 0)
git switch main
git merge --ff-only ma-branche # avance rapide : refuse de créer un commit de fusion
```

- Pour un commit isolé, `git cherry-pick <commit>` convient aussi. Un commit déjà repris de cette façon est écarté de lui-même par un `git rebase` ultérieur (« patch contents already upstream »).
- **Ne jamais réécrire ce qui est déjà poussé.** Un rebase ne touche que des commits locaux, absents de `origin/main`. Une branche partagée qu'il faudrait rebaser est une décision de l'utilisateur.
- Avant de pousser, `git log --merges origin/main..main` ne doit rien afficher.
- Le refus des fusions peut être rendu automatique, dans un clone par `git config merge.ff only`, et sur GitHub par la règle « Require linear history » de la protection de `main`. Ces deux réglages reviennent à l'utilisateur.
- Une étiquette (`vX.Y`) désigne un commit de `main`. Un rebase ultérieur doit le laisser ancêtre de `main` : `git merge-base --is-ancestor vX.Y main` le vérifie.

Le 27 novembre 2026, la branche `rustysynth` avait d'abord été fusionnée dans `main` par un commit de fusion, alors que rien n'était encore poussé. `main` a été linéarisée par `git rebase`, avec le même arbre de fichiers à l'arrivée, puis poussée. Les branches devenues inutiles (`rustysynth` et la sauvegarde de l'ancien état) ont été supprimées.

## Pièges déjà rencontrés

- **Parties vides.** La séquence 1 tirée par `g-parties` peut durer 0 s, comme en Lisp : le second tirage de sa fin aléatoire dépasse parfois le premier. Le lecteur (`output/player.js`) doit enchaîner sans s'arrêter. C'est testé avec la graine 7.
- **Mémoire WebAssembly.** Un appel qui alloue (`rs_sf2_buffer`, `rs_init`…) peut agrandir la mémoire et détacher l'ancien `memory.buffer` : il faut relire `memory.buffer` **après** l'appel.
- **RustySynth** n'applique que 40 % de l'atténuation SF2, plafonne le gain d'une note à 0 dB, ignore les modulateurs, refuse un preset ou un instrument sans zone, refuse les chaînes INFO de longueur impaire et ne lit pas les SF3. `scripts/soundfont.js` compense ou contourne chacun de ces points.
- **Le pitch-bend dépend du groupe** du multi : ±7 demi-tons pour P5 et P6, ±2 ailleurs. CLCE calcule toujours pour 7 (`BEND_RANGE`), et la sortie RustySynth reproduit cet écart.
- **node-web-audio-api** déclare `getOutputTimestamp`, mais lève « not yet implemented » : `audioTime` (`output/rustysynth.js`) retombe alors sur `currentTime`.
- **Chrome** n'autorise pas un contexte audio sans geste de l'utilisateur (il faut l'option `--autoplay-policy=no-user-gesture-required` en kiosque). Sur un profil neuf, il demande l'autorisation MIDI, ce qui bloque `?demarrer` : d'où l'option `?sansmidi`.
- **Tests en temps réel.** Une minuterie peut être en retard de plusieurs dizaines de millisecondes quand les tests tournent en parallèle. On compare donc à une minuterie témoin plutôt qu'à un seuil fixe.

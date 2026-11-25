# animots-web

Lecteur en ligne (Chrome ou Edge, pour le MIDI) :

- **version figée v1.1**, à donner à une machine d'installation : https://grame-cncm.github.io/animots-web/v1.1/ui/
- version figée v1.0 (sans le diagnostic du superviseur) : https://grame-cncm.github.io/animots-web/v1.0/ui/
- version de développement (branche `main`) : https://grame-cncm.github.io/animots-web/

Après une première visite, les deux restent jouables hors ligne.

Portage en JavaScript d'**Animots**, l'installation sonore du Parc de Gerland (2013) : le langage de composition CLCE/Prorythme et les 36 séquences de `Gerland2013-4.lsp`, avec une sortie MIDI vers Kontakt 8. L'analyse de faisabilité et le plan complet sont dans un document tenu hors de ce dépôt (`Animots-Gerland-JS-analyse-et-plan.md`).

## État

| Phase | Contenu | État |
|---|---|---|
| 1 | Noyau des générateurs, rythmes, outils et données de Gerland, tests | **fait** |
| 2 | `prorythme`, `gnotes`, `n-prorythme`, `n-gnotes`, partition, export `.mid` | **fait** |
| 3 | Transpileur, 36 séquences et 6 essais générés, enchaînement des parties | **fait** |
| 4 | Validation contre le Lisp d'origine exécuté dans SBCL | **fait** : 1 456 072 notes identiques, sauf la séquence 29 (flottants, ≤ 3,6 ms) |
| 5 | Lecteur Web MIDI et interface | **fait** ; essayé en sortie simulée, pas encore avec Kontakt |
| 6 | Exploitation continue : exécuteur Node headless, launchd, chien de garde | **exécuteur fait** (206 tests en tout) ; test d'endurance de 72 h et essai avec Kontakt à faire |

## Lancer les tests

Il faut Node 20 ou plus récent. La seule dépendance, optionnelle, est `@julusian/midi` (module natif RtMidi), qui ne sert qu'à l'exécuteur headless : `npm install` l'installe, et les tests n'en ont pas besoin.

```bash
npm test
```

## Validation contre le Lisp d'origine (phase 4)

```bash
npm run check:lisp
```

La commande lance le **code Lisp de 2013 lui-même** dans SBCL : les sources CLCE de `source/clce/` et `source/Gerland2013-4.lsp`, chargés sans modification. Elle calcule les mêmes cas que le portage et compare les deux partitions note à note : date, port, canal, hauteur, durée et vélocité, ainsi que les CC9 et le tempo. Les cas couvrent les 36 séquences, les 6 essais et des enchaînements de parties par `g-parties`, sur 20 graines. Il faut SBCL (MacPorts : `sudo port install sbcl`). Sans SBCL, la comparaison est sautée dans `npm test`.

Le banc (`validation/lisp/harness.lisp`) remplace seulement ce qui n'existe plus :

- **MidiShare** : des bouchons qui enregistrent les événements, avec la sémantique de curseur de CLCE (`midi-move`, `midi-write-ev`, `midi-send-im`) ;
- **CAPI et MP** : la fenêtre et les minuteries de LispWorks, réduites à des fonctions vides ;
- **`random`** : le même générateur que `core/random.js`. Si le portage est fidèle, les deux programmes font donc les mêmes tirages, dans le même ordre.

Deux adaptations à SBCL :

- `reverse` est masqué, parce que CLCE déclare `special` une variable de ce nom, ce que SBCL refuse pour un symbole de Common Lisp ;
- `lisp-image-name`, propre à LispWorks, est remplacé par un chemin factice.

**Résultat** (20 graines, 860 cas, 1 456 072 notes) :

- Les 35 autres séquences, les 6 essais et les 20 enchaînements de parties sont **identiques au tick près**.
- La **séquence 29** ajoute aux dates des décimales (`transf-dat`, ±0.05…), qui sont des flottants simple précision en Lisp et des doubles en JavaScript. Ses notes ont les mêmes hauteurs et les mêmes vélocités, mais leurs dates dérivent de 18 ticks au plus (3,6 ms). Sur les 20 graines, une seule note a franchi une limite de `seq` et changé de hauteur. Cette séquence est déclarée dans `FLOAT_SENSITIVE` (`validation/compare.js`), avec sa raison.

**Le comparateur détecte bien les vraies infidélités.** Trois erreurs subtiles ont été introduites puis retirées, et toutes ont été repérées :

| Erreur introduite | Cas en écart, sur 126 |
|---|---|
| `laccord` évalué une seule fois dans `gnotes` | 24 |
| `sel-al` de Gerland non borné | 3 |
| `rep` qui tire la valeur avant le nombre de répétitions | 81 |

### Sources CLCE de 2013

Les fichiers compilés de l'installation datent du 28 mars 2013. Pour chaque fichier, `source/clce/` contient la source la plus récente antérieure à cette date :

| Fichier | Version | Provenance |
|---|---|---|
| 1-TimeGenerators.lisp | 1er octobre 2012 | `CLCE/Tools/3-Music/3-XTD-CLCE/3-TimeGenerator/` |
| 1MidiShare-Tempi.lisp | 10 octobre 2011 | `LispMidi-move/Tools/4-Prorythme/` |
| 2GenerateursPAJ.lisp | 21 septembre 2010 | idem |
| 3Note-Midi-Finale.lisp | 14 décembre 2012 | idem, `3Note-Midi-Finale.lisp~` |
| 4Processus.lisp | 28 mars 2013 | idem |
| 6Enigma.lisp | 4 décembre 2012 | idem |
| 7Rythmes.lisp | 9 octobre 2011 | idem, `7Rythmes.lisp~` |

Les versions plus récentes (2015, 2017), d'où le portage était parti, n'en diffèrent que par des ajouts inutilisés par Gerland (`ggnot`, `gmod`, `vrai-dur`) et par une réécriture équivalente (`p-abs` au lieu de `midi-move`).

## Jouer l'installation vers Kontakt 8

1. **Bus MIDI.** Dans Configuration audio et MIDI (fenêtre Studio MIDI), ouvrir le pilote IAC, cocher « Le gestionnaire est en ligne », et créer deux ports : `Animots A` et `Animots B`.
2. **Kontakt 8 en mode autonome** (pas en greffon, qui ne reçoit que 16 canaux) : charger le multi. Dans Options, onglet MIDI, rubrique Inputs, mettre `Animots A` sur le port A et `Animots B` sur le port B.
3. **Lecteur** : ouvrir **https://grame-cncm.github.io/animots-web/** (GitHub Pages) dans **Chrome ou Edge**. On peut aussi le servir en local :

   ```bash
   npm run serve
   ```

   puis ouvrir `http://localhost:8080/ui/`. Dans les deux cas, accepter l'accès MIDI, puis choisir `Animots A` pour le port A et `Animots B` pour le port B. Le choix est mémorisé.
4. **Démarrer** lance la boucle des parties, avec une graine aléatoire ou celle saisie. **Cercle1**, **Cercle2**, **Tutti** et **Alterne** jouent les essais de réglage. **Arrêter** coupe tout.

Sans sortie choisie, la lecture est simulée : rien ne sonne, mais l'écran montre quand même les 16 enceintes. Chacune reste colorée tant qu'une note y est tenue (vert : port A, orange : port B), et clignote à chaque attaque de note. Le clignotement apparaît même quand la note précédente n'est pas finie, comme dans Tutti où les notes s'enchaînent sans silence. Si le système demande de réduire les animations, seul l'anneau coloré apparaît, sans agrandissement. Le journal note chaque partie avec l'état de l'aléa au moment de son calcul. **Exporter la partie en cours** télécharge le `.mid` de ce qui joue.

### Fonctionnement du lecteur

- **Anticipation.** L'ordonnanceur (`output/player.js`) envoie les messages une seconde à l'avance, avec leur heure exacte : le Web MIDI les joue à l'heure, même si le battement prend du retard. Le battement vient d'un Worker, qui résiste mieux au bridage des onglets en arrière-plan qu'un `setInterval` de la page.
- **Enchaînement.** La partie suivante est calculée dès le début de la partie courante, puis placée exactement à sa fin.
- **Arrêt.** L'ordonnanceur envoie un note-off pour chaque note active, puis CC123 et CC120 sur tous les canaux, deux fois : tout de suite, puis après la fenêtre d'anticipation, pour couper aussi les notes déjà programmées.
- **Essais.** Ils remplacent ce qui joue et s'arrêtent à leur fin. En 2013, le bouton remplaçait la partie, mais la minuterie de la partie suivante restait armée.

## Exploitation sans navigateur : l'exécuteur headless (phase 6)

L'exécuteur joue l'installation sous Node.js, sans interface. C'est la forme prévue pour une installation qui tourne en continu. Il reprend le noyau, les séquences, `g-parties` et l'ordonnanceur du lecteur web, avec une sortie MIDI native (`@julusian/midi`, CoreMIDI).

```bash
npm install                      # une fois : installe @julusian/midi
npm run headless -- --liste      # sorties MIDI du système
npm run headless                 # crée les ports virtuels « Animots A » et « Animots B » et joue
```

Dans Kontakt 8 en mode autonome (Options, onglet MIDI, rubrique Inputs), relier « Animots A » au port A et « Animots B » au port B. Les ports virtuels évitent les bus IAC. Pour passer quand même par des sorties existantes, il suffit d'indiquer une partie de leur nom : `npm run headless -- --sortie-a "IAC Bus 1" --sortie-b "IAC Bus 2"`.

| Option | Effet |
|---|---|
| `--graine N` | graine de l'aléa (aléatoire par défaut) |
| `--sortie-a NOM`, `--sortie-b NOM` | sortie existante dont le nom contient NOM, au lieu d'un port virtuel |
| `--essai NOM` | joue un essai (`cercle1`, `cercle2`, `tutti`, `alterne`…) puis s'arrête |
| `--duree S` | s'arrête après S secondes |
| `--journal FICHIER` | une ligne par partie : date, numéro, séquence, durée, état de l'aléa |
| `--battement FICHIER` | fichier réécrit toutes les 10 s, surveillé par le chien de garde |
| `--eveille` | empêche la mise en veille tant que l'exécuteur tourne (`caffeinate`) |
| `--simule` | aucune sortie MIDI |

**Précision.** RtMidi envoie chaque message dès qu'on le lui donne. La sortie Node (`output/node-midi.js`) garde donc les messages dans une file datée, qu'elle vide toutes les millisecondes ; le retard mesuré à l'envoi est de 1 ms au plus. Contrairement au Web MIDI, elle peut annuler ce qui est programmé : l'arrêt est immédiat. Ctrl-C ou SIGTERM coupent le son, laissent partir les derniers messages et ferment les ports.

**Essai réel.** Un second processus a écouté les ports virtuels pendant un essai Cercle1. Il a reçu par CoreMIDI les notes, une par seconde, puis les messages d'arrêt sur les deux ports.

### Installation permanente (launchd)

```bash
deploy/install.sh                                         # ports virtuels
deploy/install.sh --sortie-a "IAC Bus 1" --sortie-b "IAC Bus 2"
deploy/install.sh --desinstaller
```

Le script installe deux agents launchd pour l'utilisateur courant :

- **`com.grame.animots`** : l'exécuteur, démarré à l'ouverture de session et relancé s'il s'arrête (`KeepAlive`), avec `--journal`, `--battement` et `--eveille` ;
- **`com.grame.animots-watchdog`** : le chien de garde (`deploy/watchdog.sh`). Chaque minute, il relance l'exécuteur si le battement n'a pas été réécrit depuis 2 minutes. C'est l'équivalent de `restart-animots` en 2013, qui relançait l'application au bout de 30 minutes sans activité.

Journal, battement et sorties sont dans `~/Library/Logs/Animots/`. Les plists contiennent le chemin absolu de `node`, car launchd ne charge pas nvm : il faut relancer `deploy/install.sh` après un changement de version de Node, et refaire `npm install` (le module natif dépend de la version).

Le script a été essayé dans un dossier personnel factice : plists validées par `plutil -lint`, et le chien de garde vérifié sur un battement ancien et sur un battement récent. **Il n'a pas été installé sur la machine.** Reste à faire : le test d'endurance de 72 heures avec Kontakt 8.

### Variante web : la page publiée ouverte au démarrage

Sur une machine connectée au Web, l'installation peut aussi tourner dans Chrome, à partir de la page publiée sur GitHub Pages. L'adresse `ui/?demarrer` lance la boucle des parties toute seule au chargement ; `&graine=N` fixe la graine. Par défaut, le kiosque ouvre la **version figée v1.1** : `https://grame-cncm.github.io/animots-web/v1.1/ui/?demarrer`.

```bash
deploy/web-kiosk.sh --reglage     # une fois : accepter l'accès MIDI, choisir les ports A et B, quitter Chrome
deploy/install-web.sh             # agent launchd : Chrome en kiosque sur la page, à chaque ouverture de session
deploy/install-web.sh --desinstaller
```

Chrome tourne avec un profil dédié (`~/Library/Application Support/Animots/Chrome`), qui garde l'autorisation MIDI et le choix des ports. `caffeinate` empêche la mise en veille. L'agent relance Chrome s'il se ferme. Une autre adresse peut être donnée, par exemple un serveur local : `deploy/install-web.sh "http://localhost:8080/ui/?demarrer"`. Ne pas installer en même temps l'exécuteur Node : les deux joueraient.

**Fiabilité.** Deux risques de cette variante sont maintenant couverts :

- **Réseau : cache hors ligne.** Chaque version publiée a un service worker (`sw.js`, produit par `scripts/build-pages.js`). Dès la première visite, il met en cache les 63 fichiers dont la page a besoin, puis les sert depuis le cache. Ensuite, la page démarre même sans réseau, démarrage automatique compris. Une nouvelle publication remplace le cache d'un bloc ; une page déjà ouverte garde sa version jusqu'au prochain chargement. Vérifié dans Chrome, réseau coupé : rechargement complet et démarrage automatique depuis le cache. Le navigateur intégré à l'application Claude n'accepte pas les service workers.
- **Version : adresse figée.** Chaque étiquette git `vX.Y` est publiée dans son dossier (`/v1.1/`), qui ne change plus. La racine suit `main`. Le workflow `.github/workflows/pages.yml` reconstruit le site à chaque push et à chaque nouvelle étiquette, **seulement si les tests passent**. Pour qu'une étiquette puisse publier, l'environnement `github-pages` du dépôt autorise les étiquettes `v*` en plus de `main` (Settings › Environments ; réglé le 25 novembre 2026). Pour valider une nouvelle version : `git tag -a v1.2 -m "…" && git push origin v1.2`, puis donner la nouvelle adresse au kiosque (`deploy/install-web.sh "https://grame-cncm.github.io/animots-web/v1.2/ui/?demarrer"`) ou au superviseur (`--url`).

Trois risques restent, et pour une installation permanente l'exécuteur Node reste plus sûr :

- **Navigateur.** Une mise à jour de Chrome peut redemander l'autorisation MIDI, afficher un dialogue ou changer le comportement des onglets en arrière-plan.
- **Surveillance.** Une page ne peut pas écrire de fichier de battement : si elle se bloque sans que Chrome se ferme, rien ne la relance.
- **Hébergement.** Une panne de GitHub Pages, ou un changement du dépôt, empêche une *première* visite. Une machine qui a déjà chargé sa version continue depuis le cache, tant que le profil Chrome n'est pas effacé.

Ce n'est pas vérifié : un fonctionnement de plusieurs jours en kiosque. Ont été essayés : le démarrage automatique (`?demarrer`), le cache hors ligne dans Chrome, et l'installateur dans un dossier personnel factice.

### Mode recommandé sur une machine connectée : le superviseur (web, puis headless en secours)

Le superviseur (`scripts/superviseur.js`) essaie la version web et bascule sur l'exécuteur headless si la page ne joue pas.

1. Il lance Chrome en kiosque sur la version figée, avec le profil dédié et un port de débogage local (127.0.0.1).
2. Toutes les 10 secondes, il lit le diagnostic de la page (`window.animotsDiagnostic`) par le protocole DevTools. La page n'envoie rien elle-même : il n'y a pas de requête d'un site public vers le réseau local, que Chrome restreint.
3. La page **joue** si la boucle des parties tourne, si les ports A et B sont reliés à de vraies sorties MIDI et si l'ordonnanceur bat encore.
4. Sinon, au bout d'une minute au démarrage, après trois contrôles en échec ensuite, ou dès que Chrome s'arrête, le superviseur **ferme Chrome**, attend qu'il soit fermé, puis lance l'**exécuteur headless**. Les deux ne jouent jamais ensemble. Il n'y a pas de retour au web pendant la session : le web sera retenté à l'ouverture de session suivante.

#### Installer le superviseur avec les bus IAC

**Pourquoi des bus IAC.** Kontakt écoute des entrées MIDI précises, et les deux modes doivent envoyer au même endroit. La page web (Chrome) ne peut envoyer que vers des sorties qui existent déjà sur la machine. L'exécuteur headless, lui, crée par défaut des ports virtuels (« Animots A », « Animots B ») qui n'existent que tant qu'il tourne. Si chaque mode avait ses sorties, Kontakt n'en écouterait qu'une partie, et une bascule rendrait l'installation muette. Les bus IAC sont des sorties MIDI permanentes de macOS, utilisables par les deux modes : Kontakt les écoute une fois pour toutes.

Les étapes, à faire une seule fois :

1. **Bus IAC.** Dans Configuration audio et MIDI (menu Fenêtre › Afficher le studio MIDI), double-cliquer sur le gestionnaire IAC. Le pilote doit être en ligne, avec deux bus. Sur un macOS en français, ils s'appellent « Gestionnaire IAC Bus 1 » et « Bus 2 ». On peut les renommer « Animots A » et « Animots B » ; il faut alors donner ces noms aux étapes suivantes.
2. **Kontakt 8**, en mode autonome, avec le multi chargé. Dans Options › MIDI › Inputs, mettre le bus 1 sur le **port A** et le bus 2 sur le **port B**.
3. **Réglage de la page**, dans le profil Chrome dédié :

   ```bash
   deploy/web-kiosk.sh --reglage
   ```

   Chrome s'ouvre dans une fenêtre normale. Accepter l'accès MIDI, choisir le bus 1 pour le port A et le bus 2 pour le port B, puis quitter Chrome. Le profil garde l'autorisation et les choix.
4. **Installation du superviseur**, avec les mêmes bus :

   ```bash
   deploy/install-auto.sh --sortie-a "IAC Bus 1" --sortie-b "IAC Bus 2"
   ```

   `--sortie-a` et `--sortie-b` indiquent à l'exécuteur de secours où envoyer en cas de bascule. Une partie du nom suffit : « IAC Bus 1 » trouve « Gestionnaire IAC Bus 1 ».

**Ce que fait l'installation.** Le script écrit deux agents dans `~/Library/LaunchAgents/` et les démarre aussitôt :

- `com.grame.animots-auto` : le superviseur, lancé à chaque ouverture de session et relancé s'il s'arrête ;
- `com.grame.animots-watchdog` : le chien de garde, qui vérifie chaque minute que le superviseur est vivant et le relance sinon.

Le journal (`~/Library/Logs/Animots/session.log`) note chaque décision, par exemple `la page joue (version v1.1…)`, ou `bascule sur l'exécuteur headless : au bout de 60 s, la page ne joue pas : Web MIDI refusé ou indisponible : lecture simulée, muette`. Pour tout retirer : `deploy/install-auto.sh --desinstaller`.

**Ce que l'installation ne fait pas :**

- **Elle ne lance pas Kontakt.** Il faut ajouter Kontakt 8 aux éléments ouverts à la connexion (Réglages Système › Général) et vérifier qu'il **recharge bien le multi** au démarrage, ce qui n'a pas encore été vérifié. Si Kontakt est un peu en retard, la première partie (25 s de silence) laisse le temps, et chaque partie renvoie ses CC9 au début.
- **Elle n'ouvre pas la session.** Les agents démarrent à l'ouverture de la session de l'utilisateur. Pour qu'une machine reparte seule après une coupure de courant, il faut activer l'ouverture de session automatique (Réglages Système › Utilisateurs et groupes) et le redémarrage après une panne de courant (réglages d'énergie).

Ce qui est couvert : pas de réseau à la toute première visite, page plantée ou bloquée, autorisation MIDI perdue après une mise à jour de Chrome (lecture simulée, donc muette), Chrome absent ou qui s'arrête.

Essais réalisés, avec le vrai Chrome sans fenêtre et un profil temporaire :

- page sans MIDI : bascule au bout du délai, avec la bonne raison ;
- page acceptée (`--accepter-simule`) : le superviseur reste sur le web ;
- Chrome tué en cours de route : bascule au contrôle suivant ;
- Chrome absent : bascule immédiate.

Les deux premiers essais et le dernier sont dans `tests/superviseur.test.js`. L'installateur a été essayé dans un dossier personnel factice. **Rien n'est installé sur la machine**, et un fonctionnement de plusieurs jours n'a pas été essayé.

## Exporter une séquence en fichier MIDI

```bash
npm run export:mid -- 3 2013
```

Les arguments sont le numéro de la séquence (1 à 36) ou le nom d'un essai (`cercle1`, `cercle2`, `tutti`, `alterne`, `essai`, `essai1bis`), la graine de l'aléa (2013 par défaut) et, en option, la durée en noires. Sans durée, elle est tirée comme dans `g-parties`. Le fichier `out/sequence-3-2013.mid` est au format 1, avec une piste par port (A et B, méta-événement « MIDI port ») à 5 040 ticks par noire. Le script affiche un résumé : durée, notes par canal, plage des hauteurs.


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
  clce/                   sources CLCE de 2013 utilisées par Gerland, non modifiées
validation/
  compare.js              phase 4 : compare Lisp (SBCL) et JavaScript note à note (npm run check:lisp)
  lisp/harness.lisp       banc SBCL : charge CLCE et Gerland d'origine, bouchons MidiShare, aléa commun
transpiler/
  reader.js               lecteur Lisp qui garde commentaires et numéros de ligne
  emit.js                 traduction des séquences et des essais en JavaScript
  generate.js             production des fichiers de piece/gerland/sequences/
output/
  node-midi.js            sortie MIDI Node : file datée, ports virtuels ou sorties existantes (RtMidi)
  player.js               ordonnanceur : anticipation, enchaînement des parties, notes actives, arrêt
  webmidi.js              sortie Web MIDI (ports A et B reliés à des sorties du système)
  simulated.js            sortie simulée (aucun son, sert à l'affichage et aux essais)
  ticker.js, ticker-worker.js  battement de l'ordonnanceur (Worker, ou setInterval en repli)
  smf.js                  export en fichier MIDI standard, et relecture pour vérification
ui/
  index.html, app.js, style.css  page du lecteur (remplace la fenêtre CAPI « Animots »)
scripts/
  export-mid.js           calcule une séquence ou un essai et l'exporte en .mid
  transpile.js            régénère les séquences depuis source/ (--check : vérifie seulement)
  serve.js                serveur local de la page (127.0.0.1, port 8080 par défaut ; un dossier en option)
  build-pages.js          construit le site Pages : main à la racine, chaque étiquette vX.Y figée, service workers
  headless.js             exécuteur sans navigateur (npm run headless)
  superviseur.js          essaie la page web dans Chrome, bascule sur l'exécuteur si elle ne joue pas
deploy/
  install.sh              installe ou retire les agents launchd (exécuteur et chien de garde)
  watchdog.sh             relance l'exécuteur si son battement s'arrête
  install-web.sh          variante : agent launchd qui ouvre la page dans Chrome en kiosque
  web-kiosk.sh            lance Chrome (profil dédié, kiosque, caffeinate) ; --reglage pour le premier réglage
  install-auto.sh         mode recommandé : agent launchd du superviseur (web, puis headless en secours)
.github/workflows/
  pages.yml               tests, puis publication du site sur GitHub Pages (push sur main, étiquette v*)
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

- **Rationnels et flottants.** Le Lisp calcule en rationnels exacts, le portage en flottants doubles. Les durées restent exactes au tick près grâce à `ticks()`, comme la phase 4 l'a vérifié. Seule exception : les décimales de la séquence 29, qui sont des flottants simple précision en Lisp et donnent jusqu'à 3,6 ms d'écart.
- **Liste nue dans un rythme.** Une liste qui ne suit pas un symbole de n-olet (`((1 2) 3)`) provoque une erreur ici. En Lisp, elle passait sans erreur mais donnait une durée incohérente.
- **Pitch-bend.** CLCE envoie un pitch-bend avant chaque note. Le port ne garde que ceux qui changent la valeur du canal, dans l'ordre du temps, ce qui a le même effet. Une note de vélocité 0 n'envoie pas le sien.
- **Durée d'une partie.** C'est la fin de la dernière note (`score.end`), notes muettes comprises. Les notes en « long staccato » (`stac` de 3 à 8) peuvent résonner au-delà de la fin tirée, comme dans le Lisp. Le `msh-seq-all-duration` d'origine, qui fixait l'enchaînement, n'est pas dans les sources disponibles.
- **Lecteur MidiShare de 2013 non émulé (décision du 25 novembre 2026).** Avant de jouer, `player` (`8Player.lisp`) ramenait les dates de 5 040 à 504 ticks par noire, avec un arrondi qui atteint 1 ms, et raccourcissait chaque note de 2 ticks à 504 par noire, soit environ 4 ms. Le portage joue la partition à 5 040 ticks par noire, avec la durée `floor(dur × stac) − 1` de CLCE. L'écart est inaudible. La phase 4 compare la partition écrite dans `*out*`, pas ce que le lecteur en jouait.
- **`seq` en temps renversé.** À `ctime = etime`, `seq` rend NIL au lieu de l'erreur de `nth -1` du Lisp.

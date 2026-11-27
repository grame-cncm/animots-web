# Raccourcis pour lancer le lecteur Animots. `make` ou `make help` affiche les cibles.

SF2 ?= ../conversion-multi/gerland.sf2
GRAINE ?= 2013
PORT ?= 8080
RUSTYSYNTH := vendor/rustysynth
GRAINES ?= 50
PARTIES ?= 200
HEURES ?= 24
CHROME ?= /Applications/Google Chrome.app
# profil Chrome dédié : n'interfère ni avec le Chrome habituel ni avec le profil du kiosque
PROFIL ?= $(HOME)/Library/Application Support/Animots/Chrome-web-auto

.DEFAULT_GOAL := help
.PHONY: help echantillonneur muet web web-auto rustysynth endurance endurance-audio

help: ## Affiche cette aide
	@echo "Cibles :"
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | sed -E 's/:.*## /\t/' | awk -F'\t' '{ printf "  make %-16s %s\n", $$1, $$2 }'
	@echo ""
	@echo "Variables (valeur actuelle) :"
	@echo "  SF2=$(SF2)"
	@echo "  GRAINE=$(GRAINE)"
	@echo "  PORT=$(PORT)"
	@echo ""
	@echo "Exemple : make echantillonneur GRAINE=7 SF2=autre.sf2"

echantillonneur: ## Joue l'installation par l'échantillonneur intégré (RustySynth), sur la sortie audio par défaut
	node scripts/headless.js --echantillonneur $(SF2) --graine $(GRAINE)

muet: ## Comme echantillonneur, mais sans son (essai : le journal montre les parties)
	node scripts/headless.js --echantillonneur $(SF2) --graine $(GRAINE) --muet

web: ## Lance le serveur web local : page sur http://localhost:8080/ui/ (PORT=… pour un autre port ; Ctrl-C arrête)
	node scripts/serve.js $(PORT)

web-auto: ## Serveur local + Chrome qui charge le SoundFont SF2 et démarre seul l'installation (son compris)
	@test -f "$(SF2)" || { echo "SoundFont introuvable : $(SF2) (make web-auto SF2=…)"; exit 1; }
	@mkdir -p out
	@ln -sf "$(abspath $(SF2))" out/soundfont.sf2
	@echo "Ouverture de Chrome dans 1 s ; Ctrl-C arrête le serveur (fermer aussi la fenêtre de Chrome)."
	@(sleep 1; open -na "$(CHROME)" --args --user-data-dir="$(PROFIL)" --no-first-run \
	  --autoplay-policy=no-user-gesture-required --new-window \
	  "http://localhost:$(PORT)/ui/?demarrer&sansmidi&graine=$(GRAINE)&sf2=../out/soundfont.sf2") &
	node scripts/serve.js $(PORT)

rustysynth: ## Reconstruit le module WebAssembly depuis le sous-module vendor/rustysynth et le recopie dans output/rustysynth/
	@test -f $(RUSTYSYNTH)/Cargo.toml || { echo "Sous-module absent : git submodule update --init"; exit 1; }
	cd $(RUSTYSYNTH) && cargo build -p rustysynth_wasm --release --target wasm32-unknown-unknown
	cp $(RUSTYSYNTH)/target/wasm32-unknown-unknown/release/rustysynth_wasm.wasm output/rustysynth/
	cp $(RUSTYSYNTH)/LICENSE.txt output/rustysynth/LICENSE.txt
	node scripts/rustysynth-copie.js

endurance: ## Vieillissement accéléré : GRAINES × PARTIES parties à travers le lecteur (≈ 450 h par défaut, en secondes)
	node --expose-gc scripts/endurance.js --graines $(GRAINES) --parties $(PARTIES)

endurance-audio: ## Endurance audio accélérée : HEURES heures rendues par RustySynth sans carte son (≈ 160 fois le temps réel)
	node scripts/endurance-audio.js --sf2 $(SF2) --heures $(HEURES) --graine $(GRAINE)

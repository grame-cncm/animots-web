# Raccourcis pour lancer le lecteur Animots. `make` ou `make help` affiche les cibles.

SF2 ?= ../conversion-multi/gerland.sf2
GRAINE ?= 2013

.DEFAULT_GOAL := help
.PHONY: help echantillonneur muet

help: ## Affiche cette aide
	@echo "Cibles :"
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | sed -E 's/:.*## /\t/' | awk -F'\t' '{ printf "  make %-16s %s\n", $$1, $$2 }'
	@echo ""
	@echo "Variables (valeur actuelle) :"
	@echo "  SF2=$(SF2)"
	@echo "  GRAINE=$(GRAINE)"
	@echo ""
	@echo "Exemple : make echantillonneur GRAINE=7 SF2=autre.sf2"

echantillonneur: ## Joue l'installation par l'échantillonneur intégré (RustySynth), sur la sortie audio par défaut
	node scripts/headless.js --echantillonneur $(SF2) --graine $(GRAINE)

muet: ## Comme echantillonneur, mais sans son (essai : le journal montre les parties)
	node scripts/headless.js --echantillonneur $(SF2) --graine $(GRAINE) --muet

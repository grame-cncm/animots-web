# Raccourcis pour lancer le lecteur Animots.
#
#   make echantillonneur                 joue l'installation par l'échantillonneur intégré (RustySynth)
#   make echantillonneur GRAINE=7        avec une autre graine
#   make echantillonneur SF2=autre.sf2   avec un autre SoundFont

SF2 ?= ../conversion-multi/gerland.sf2
GRAINE ?= 2013

.PHONY: echantillonneur

echantillonneur:
	node scripts/headless.js --echantillonneur $(SF2) --graine $(GRAINE)

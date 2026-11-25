#!/bin/bash
# Chien de garde de l'exécuteur Animots, lancé chaque minute par launchd
# (com.grame.animots-watchdog.plist).
#
# L'exécuteur réécrit son fichier de battement toutes les 10 secondes tant que sa boucle tourne.
# Si le fichier n'a pas été réécrit depuis LIMITE secondes, l'exécuteur est bloqué : on le
# relance (launchctl kickstart -k). C'est l'équivalent de restart-animots en 2013, qui relançait
# l'application si le fichier animots-session n'avait pas bougé depuis 30 minutes.
#
# Usage : watchdog.sh <fichier de battement> [limite en secondes, 120 par défaut]

BATTEMENT="$1"
LIMITE="${2:-120}"
LABEL="com.grame.animots"

[ -n "$BATTEMENT" ] || { echo "usage : $0 <fichier de battement> [limite]"; exit 2; }
# Pas de fichier : l'exécuteur démarre, ou n'est pas installé ; launchd s'occupe du premier cas.
[ -f "$BATTEMENT" ] || exit 0

AGE=$(( $(date +%s) - $(stat -f %m "$BATTEMENT") ))
if [ "$AGE" -gt "$LIMITE" ]; then
  echo "$(date '+%Y-%m-%d %H:%M:%S') battement vieux de ${AGE} s (limite ${LIMITE} s) : relance de ${LABEL}"
  launchctl kickstart -k "gui/$(id -u)/${LABEL}"
fi

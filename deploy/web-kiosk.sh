#!/bin/bash
# Ouvre le lecteur Animots dans Google Chrome en kiosque, pour une machine d'installation
# connectée au Web. Lancé à l'ouverture de session par l'agent launchd com.grame.animots-web
# (deploy/install-web.sh), qui le relance si Chrome se ferme.
#
# Usage :
#   web-kiosk.sh [--reglage] [URL]
#
#   URL        page à ouvrir ; par défaut la version figée v1.4 publiée sur GitHub Pages, qui
#              démarre seule (?demarrer) et reste jouable hors ligne après une première visite.
#   --reglage  premier réglage : fenêtre normale, sans démarrage automatique, pour accorder
#              l'accès MIDI et choisir les sorties des ports A et B. Le profil dédié s'en
#              souvient ensuite.
#
# Chrome utilise un profil dédié (~/Library/Application Support/Animots/Chrome), distinct du
# Chrome habituel : autorisation MIDI et choix des ports y sont gardés, et une fenêtre Chrome
# déjà ouverte par ailleurs n'interfère pas.

set -e
URL_DEFAUT="https://grame-cncm.github.io/animots-web/v1.4/ui/?demarrer"
PROFIL="$HOME/Library/Application Support/Animots/Chrome"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

REGLAGE=0
if [ "$1" = "--reglage" ]; then REGLAGE=1; shift; fi
URL="${1:-$URL_DEFAUT}"
[ -x "$CHROME" ] || { echo "Google Chrome introuvable : $CHROME"; exit 1; }
mkdir -p "$PROFIL"

OPTIONS=(
  --user-data-dir="$PROFIL"
  --no-first-run
  --no-default-browser-check
  # minuteries et rendu non bridés, même si la fenêtre est masquée
  --disable-background-timer-throttling
  --disable-renderer-backgrounding
  --disable-backgrounding-occluded-windows
  --disable-features=Translate
  # pas de bulle « restaurer les pages » après un arrêt brutal
  --hide-crash-restore-bubble
)

if [ "$REGLAGE" = 1 ]; then
  exec "$CHROME" "${OPTIONS[@]}" "${URL%%\?*}"
fi

# Pas de mise en veille tant que Chrome tourne : exec garde le même processus, que caffeinate surveille.
caffeinate -dimsu -w $$ &
exec "$CHROME" "${OPTIONS[@]}" --kiosk "$URL"

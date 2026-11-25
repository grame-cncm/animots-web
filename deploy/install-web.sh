#!/bin/bash
# Variante web de deploy/install.sh : à l'ouverture de session, ouvre le lecteur Animots dans
# Chrome en kiosque (deploy/web-kiosk.sh) au lieu de lancer l'exécuteur Node. La machine doit
# être connectée au Web si l'adresse est celle de GitHub Pages.
#
# Usage :
#   deploy/install-web.sh [URL]       installe et démarre (URL par défaut : version figée v1.0 sur
#                                     GitHub Pages, ?demarrer)
#   deploy/install-web.sh --desinstaller
#
# Avant la première installation, faire une fois le réglage :
#   deploy/web-kiosk.sh --reglage
# accepter l'accès MIDI, choisir les sorties des ports A et B, puis quitter Chrome.
#
# Ne pas installer en même temps l'exécuteur Node (deploy/install.sh) : les deux joueraient.

set -e
AGENTS="$HOME/Library/LaunchAgents"
LOGS="$HOME/Library/Logs/Animots"
PROJET="$(cd "$(dirname "$0")/.." && pwd)"
LABEL="com.grame.animots-web"
UID_GUI="gui/$(id -u)"

if [ "$1" = "--desinstaller" ]; then
  launchctl bootout "$UID_GUI/$LABEL" 2>/dev/null || true
  rm -f "$AGENTS/$LABEL.plist"
  echo "agent $LABEL retiré"
  exit 0
fi

if [ -f "$AGENTS/com.grame.animots.plist" ]; then
  echo "L'exécuteur Node (com.grame.animots) est installé : le retirer d'abord (deploy/install.sh --desinstaller)."
  exit 1
fi

URL="${1:-https://grame-cncm.github.io/animots-web/v1.0/ui/?demarrer}"
mkdir -p "$AGENTS" "$LOGS"
cat > "$AGENTS/$LABEL.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>$PROJET/deploy/web-kiosk.sh</string>
    <string>$URL</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>20</integer>
  <key>StandardOutPath</key><string>$LOGS/web-stdout.log</string>
  <key>StandardErrorPath</key><string>$LOGS/web-stderr.log</string>
</dict>
</plist>
EOF
launchctl bootout "$UID_GUI/$LABEL" 2>/dev/null || true
launchctl bootstrap "$UID_GUI" "$AGENTS/$LABEL.plist"
echo "installé : $AGENTS/$LABEL.plist (ouvre $URL)"

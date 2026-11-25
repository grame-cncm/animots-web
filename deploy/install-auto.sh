#!/bin/bash
# Installe le superviseur Animots (scripts/superviseur.js) comme agent launchd : à l'ouverture de
# session, il essaie la version web (Chrome en kiosque sur la version figée) et bascule sur
# l'exécuteur headless si la page ne joue pas. C'est le mode recommandé pour une machine
# connectée au Web.
#
#  - com.grame.animots-auto : le superviseur, relancé s'il s'arrête (KeepAlive) ;
#  - com.grame.animots-watchdog : le chien de garde, chaque minute, qui relance le superviseur
#    si le battement s'arrête.
#
# Usage :
#   deploy/install-auto.sh --sortie-a NOM --sortie-b NOM [--url URL]
#   deploy/install-auto.sh --desinstaller
#
# --sortie-a / --sortie-b : sorties de l'exécuteur en cas de bascule. Donner les mêmes que dans
# la page (par exemple les bus IAC « IAC Bus 1 » et « IAC Bus 2 »), reliées dans Kontakt 8 aux
# ports A et B : ainsi Kontakt reçoit au même endroit dans les deux modes.
#
# Avant la première installation, faire une fois le réglage de la page :
#   deploy/web-kiosk.sh --reglage
# accepter l'accès MIDI, choisir les mêmes sorties pour les ports A et B, puis quitter Chrome.
#
# Ne pas installer en même temps deploy/install.sh ni deploy/install-web.sh : ils joueraient aussi.

set -e
AGENTS="$HOME/Library/LaunchAgents"
LOGS="$HOME/Library/Logs/Animots"
PROJET="$(cd "$(dirname "$0")/.." && pwd)"
LABEL="com.grame.animots-auto"
UID_GUI="gui/$(id -u)"

if [ "$1" = "--desinstaller" ]; then
  for label in com.grame.animots-watchdog "$LABEL"; do
    launchctl bootout "$UID_GUI/$label" 2>/dev/null || true
    rm -f "$AGENTS/$label.plist"
  done
  echo "agents retirés"
  exit 0
fi

for autre in com.grame.animots com.grame.animots-web; do
  if [ -f "$AGENTS/$autre.plist" ]; then
    echo "L'agent $autre est installé : le retirer d'abord (deploy/install.sh ou install-web.sh --desinstaller)."
    exit 1
  fi
done

NODE="$(command -v node)" || { echo "node introuvable dans le PATH"; exit 1; }
EXTRA=()
while [ $# -gt 0 ]; do
  case "$1" in
    --sortie-a|--sortie-b|--url) EXTRA+=("$1" "$2"); shift 2 ;;
    *) echo "option inconnue : $1"; exit 2 ;;
  esac
done
case " ${EXTRA[*]} " in
  *" --sortie-a "*) ;;
  *) echo "Attention : sans --sortie-a / --sortie-b, l'exécuteur de secours créera des ports virtuels, que Kontakt doit aussi écouter." ;;
esac

mkdir -p "$AGENTS" "$LOGS"
ARGS=""
for a in "$PROJET/scripts/superviseur.js" --journal "$LOGS/session.log" --battement "$LOGS/battement" --eveille "${EXTRA[@]}"; do
  ARGS="$ARGS    <string>$a</string>
"
done

cat > "$AGENTS/$LABEL.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NODE</string>
$ARGS  </array>
  <key>WorkingDirectory</key><string>$PROJET</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>20</integer>
  <key>StandardOutPath</key><string>$LOGS/stdout.log</string>
  <key>StandardErrorPath</key><string>$LOGS/stderr.log</string>
</dict>
</plist>
EOF

cat > "$AGENTS/com.grame.animots-watchdog.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.grame.animots-watchdog</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>$PROJET/deploy/watchdog.sh</string>
    <string>$LOGS/battement</string>
    <string>180</string>
    <string>$LABEL</string>
  </array>
  <key>StartInterval</key><integer>60</integer>
  <key>StandardOutPath</key><string>$LOGS/watchdog.log</string>
  <key>StandardErrorPath</key><string>$LOGS/watchdog.log</string>
</dict>
</plist>
EOF

for label in "$LABEL" com.grame.animots-watchdog; do
  launchctl bootout "$UID_GUI/$label" 2>/dev/null || true
  launchctl bootstrap "$UID_GUI" "$AGENTS/$label.plist"
done
echo "installé : $AGENTS/$LABEL.plist et com.grame.animots-watchdog.plist"
echo "journal : $LOGS/session.log"

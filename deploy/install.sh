#!/bin/bash
# Installe l'exécuteur Animots comme agent launchd de l'utilisateur courant :
#  - com.grame.animots : l'exécuteur headless, lancé à l'ouverture de session et relancé
#    s'il s'arrête (KeepAlive) ;
#  - com.grame.animots-watchdog : le chien de garde, chaque minute.
#
# Usage :
#   deploy/install.sh [--sortie-a NOM --sortie-b NOM]   installe et démarre
#   deploy/install.sh --desinstaller                    arrête et retire les deux agents
#
# Sans --sortie-a / --sortie-b, l'exécuteur crée les ports virtuels « Animots A » et
# « Animots B », à relier dans Kontakt 8 (Options > MIDI > Inputs) aux ports A et B.
# Journal et battement : ~/Library/Logs/Animots/.

set -e
AGENTS="$HOME/Library/LaunchAgents"
LOGS="$HOME/Library/Logs/Animots"
PROJET="$(cd "$(dirname "$0")/.." && pwd)"
UID_GUI="gui/$(id -u)"

if [ "$1" = "--desinstaller" ]; then
  for label in com.grame.animots-watchdog com.grame.animots; do
    launchctl bootout "$UID_GUI/$label" 2>/dev/null || true
    rm -f "$AGENTS/$label.plist"
  done
  echo "agents retirés"
  exit 0
fi

NODE="$(command -v node)" || { echo "node introuvable dans le PATH"; exit 1; }
EXTRA=()
while [ $# -gt 0 ]; do
  case "$1" in
    --sortie-a|--sortie-b) EXTRA+=("$1" "$2"); shift 2 ;;
    *) echo "option inconnue : $1"; exit 2 ;;
  esac
done

mkdir -p "$AGENTS" "$LOGS"
ARGS=""
for a in "$PROJET/scripts/headless.js" --journal "$LOGS/session.log" --battement "$LOGS/battement" --eveille "${EXTRA[@]}"; do
  ARGS="$ARGS    <string>$a</string>
"
done

cat > "$AGENTS/com.grame.animots.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.grame.animots</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NODE</string>
$ARGS  </array>
  <key>WorkingDirectory</key><string>$PROJET</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>10</integer>
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
    <string>120</string>
  </array>
  <key>StartInterval</key><integer>60</integer>
  <key>StandardOutPath</key><string>$LOGS/watchdog.log</string>
  <key>StandardErrorPath</key><string>$LOGS/watchdog.log</string>
</dict>
</plist>
EOF

for label in com.grame.animots com.grame.animots-watchdog; do
  launchctl bootout "$UID_GUI/$label" 2>/dev/null || true
  launchctl bootstrap "$UID_GUI" "$AGENTS/$label.plist"
done
echo "installé : $AGENTS/com.grame.animots.plist et com.grame.animots-watchdog.plist"
echo "journal : $LOGS/session.log"

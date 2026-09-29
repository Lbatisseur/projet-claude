#!/bin/bash
# Hook non bloquant : joue un son système macOS.
# Usage : notify-sound.sh <NomDuSon>   (sons disponibles : /System/Library/Sounds/)
# Ne doit jamais faire échouer la session : toute erreur est ignorée.
sound="/System/Library/Sounds/${1:-Glass}.aiff"
[ -f "$sound" ] && afplay "$sound" >/dev/null 2>&1 &
exit 0

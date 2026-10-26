#!/bin/bash
# Démarre ou arrête la version de production d'un site, le temps d'un audit.
#
# Usage : serveur.sh start <dossier-du-site>   → affiche « URL http://localhost:<port> »
#         serveur.sh stop  <dossier-du-site>
#
# Le site doit déjà être construit (`next build`, fait par /verifier). Le serveur
# tourne dans son propre groupe de processus, sur le premier port libre entre 3100
# et 3199 ; son numéro de processus et son port sont notés dans
# .claude/state/auditer/<site>.serveur, son journal dans <site>.log.
#
# Codes de sortie : 0 = fait, 1 = le serveur n'a pas démarré, 2 = usage ou site invalide.

ATTENTE_MAX=${SERVEUR_ATTENTE:-30}

action=$1
dossier=${2%/}
if [ "$action" != start ] && [ "$action" != stop ] || [ -z "$dossier" ]; then
  echo "Usage : serveur.sh start|stop <dossier-du-site>" >&2
  exit 2
fi
if [ ! -f "$dossier/package.json" ]; then
  echo "Site introuvable : $dossier (pas de package.json)" >&2
  exit 2
fi
dossier=$(cd "$dossier" && pwd)
nom=$(basename "$dossier")
racine=$(cd "$(dirname "$0")/../../../.." && pwd)
etat="$racine/.claude/state/auditer"
fiche="$etat/$nom.serveur"
journal="$etat/$nom.log"
mkdir -p "$etat"

en_marche() { [ -n "$1" ] && kill -0 "$1" 2>/dev/null; }

arreter() {
  local pid=""
  [ -f "$fiche" ] && read -r pid _ <"$fiche"
  if en_marche "$pid"; then
    # Signal à tout le groupe : next start lance des processus enfants
    kill -TERM -- "-$pid" 2>/dev/null
    for _ in 1 2 3 4 5 6 7 8 9 10; do
      en_marche "$pid" || break
      sleep 0.5
    done
    en_marche "$pid" && kill -KILL -- "-$pid" 2>/dev/null
  fi
  : >"$fiche"
}

if [ "$action" = stop ]; then
  arreter
  echo "Serveur de $nom arrêté."
  exit 0
fi

# start
if [ ! -f "$dossier/.next/BUILD_ID" ]; then
  echo "Aucune version de production construite dans $dossier : lance /verifier d'abord (il exécute next build)." >&2
  exit 2
fi
if [ ! -x "$dossier/node_modules/.bin/next" ]; then
  echo "Dépendances absentes dans $dossier : lance npm install." >&2
  exit 2
fi

# Un serveur précédent de ce site, oublié, est arrêté d'abord
arreter

port=""
for p in $(seq 3100 3199); do
  if ! lsof -nP -iTCP:"$p" -sTCP:LISTEN >/dev/null 2>&1; then
    port=$p
    break
  fi
done
if [ -z "$port" ]; then
  echo "Aucun port libre entre 3100 et 3199." >&2
  exit 1
fi

# set -m : le serveur reçoit son propre groupe de processus, qu'on pourra arrêter d'un coup
set -m
(cd "$dossier" && exec nohup node_modules/.bin/next start -p "$port") >"$journal" 2>&1 &
pid=$!
set +m
echo "$pid $port" >"$fiche"

for _ in $(seq 1 $((ATTENTE_MAX * 2))); do
  if ! en_marche "$pid"; then
    echo "Le serveur s'est arrêté au démarrage. Fin du journal ($journal) :" >&2
    tail -n 20 "$journal" >&2
    : >"$fiche"
    exit 1
  fi
  if curl -s -o /dev/null --max-time 2 "http://localhost:$port/"; then
    echo "URL http://localhost:$port"
    exit 0
  fi
  sleep 0.5
done

echo "Le serveur ne répond pas après ${ATTENTE_MAX} s. Fin du journal ($journal) :" >&2
tail -n 20 "$journal" >&2
arreter
exit 1

#!/bin/bash
# Démarre ou arrête la version de production d'un site, le temps d'un audit.
#
# Usage : serveur.sh start <dossier-du-site>   → affiche « URL http://localhost:<port> »
#         serveur.sh stop  <dossier-du-site>
#
# Commande choisie, dans cet ordre :
#   1. le script npm « serveur:audit » du site s'il existe, lancé avec PORT=<port>
#      (cas particulier d'un site : par exemple un mode démo sans connexion) ;
#   2. Next.js : `next start` (le site doit être construit : .next/BUILD_ID) ;
#   3. Vite : `vite preview` (le site doit être construit : dist/index.html).
# /verifier construit la version de production. Le serveur tourne dans son propre
# groupe de processus, sur le premier port libre entre 3100 et 3199 ; son numéro de
# processus et son port sont notés dans .claude/state/auditer/<site>.serveur, son
# journal dans <site>.log.
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
    # Signal à tout le groupe : next start, npm run… lancent des processus enfants
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

# start : quelle commande ?
if node -e 'const p = require(process.argv[1]); process.exit(p.scripts && p.scripts["serveur:audit"] ? 0 : 1)' "$dossier/package.json" 2>/dev/null; then
  mode=npm
  outil=""
elif [ -f "$dossier/.next/BUILD_ID" ]; then
  mode=next
  outil="$dossier/node_modules/.bin/next"
elif [ -f "$dossier/dist/index.html" ]; then
  mode=vite
  outil="$dossier/node_modules/.bin/vite"
else
  echo "Aucune version de production construite dans $dossier : lance /verifier d'abord (il construit le site)." >&2
  exit 2
fi
if [ ! -d "$dossier/node_modules" ] || { [ -n "$outil" ] && [ ! -x "$outil" ]; }; then
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
case $mode in
  npm) (cd "$dossier" && PORT=$port exec nohup npm run --silent serveur:audit) >"$journal" 2>&1 & ;;
  next) (cd "$dossier" && exec nohup node_modules/.bin/next start -p "$port") >"$journal" 2>&1 & ;;
  vite) (cd "$dossier" && exec nohup node_modules/.bin/vite preview --port "$port" --strictPort) >"$journal" 2>&1 & ;;
esac
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

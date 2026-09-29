#!/bin/bash
# Lance les vérifications d'un site, dans l'ordre, et affiche un rapport.
# Usage : verify.sh <dossier-du-site>
# Variable : VERIFIER_TIMEOUT = durée max d'une étape en secondes (défaut : 600)
# Code de sortie : 0 si tout passe, 1 si au moins une étape échoue ou manque,
#                  2 si le site ne peut pas être vérifié (voir le message).

timeout_s="${VERIFIER_TIMEOUT:-600}"

# Arrêt immédiat, avec un message clair, quand la vérification est impossible
abort() { echo "❌ Vérification impossible : $1" >&2; exit 2; }

# ── Contrôles préalables ──────────────────────────────────────────────
site_dir="${1:-.}"
[ -f "$site_dir/package.json" ] || abort "aucun package.json dans '$site_dir', ce n'est pas un site Node."
cd "$site_dir" || abort "dossier '$site_dir' inaccessible."
command -v node >/dev/null || abort "Node.js n'est pas installé."
node -e 'JSON.parse(require("fs").readFileSync("package.json", "utf8"))' 2>/dev/null \
  || abort "package.json n'est pas un JSON valide."

# Gestionnaire de paquets, déduit du fichier de verrouillage
if   [ -f pnpm-lock.yaml ]; then pm=pnpm
elif [ -f yarn.lock ];      then pm=yarn
elif [ -f bun.lockb ] || [ -f bun.lock ]; then pm=bun
else pm=npm
fi
command -v "$pm" >/dev/null || abort "le projet utilise $pm, qui n'est pas installé."
[ -d node_modules ] || abort "dépendances non installées : lancer '$pm install' dans $(pwd)."

# ── Outils ────────────────────────────────────────────────────────────
# script_cmd <script> : affiche la commande du script npm (vide si absent)
script_cmd() { node -e "process.stdout.write(require('./package.json').scripts?.['$1'] ?? '')"; }

# with_timeout <secondes> <commande…> : lance la commande dans son propre groupe
# de processus et tue tout le groupe (enfants compris) si elle dépasse la durée.
# Code de sortie : celui de la commande, ou 124 en cas de dépassement.
with_timeout() {
  perl -e '
    my $t = shift;
    my $pid = fork // die "fork: $!";
    if ($pid == 0) { setpgrp(0, 0); exec @ARGV or exit 127; }
    local $SIG{ALRM} = sub { kill "TERM", -$pid; sleep 2; kill "KILL", -$pid; exit 124; };
    alarm $t;
    waitpid($pid, 0);
    exit($? & 127 ? 128 + ($? & 127) : $? >> 8);
  ' "$@"
}

# ── Vérifications ─────────────────────────────────────────────────────
# Étapes, dans l'ordre : nom du script npm | libellé
steps=(
  "format:check|Formatage"
  "lint|Lint"
  "typecheck|Types TypeScript"
  "test|Tests"
  "build|Build de production"
)

tmp_root="${TMPDIR:-/tmp}"
log_dir=$(mktemp -d "${tmp_root%/}/verifier.XXXXXX")

failed=0
report=""
failed_logs=()
for step in "${steps[@]}"; do
  script="${step%%|*}"
  label="${step#*|}"
  log="$log_dir/${script//:/-}.log"
  cmd=$(script_cmd "$script")

  if [ -z "$cmd" ]; then
    report+="⚠️  $label — script \"$script\" absent du package.json"$'\n'
    failed=1
    continue
  fi
  # ESLint ne sort en erreur que sur les erreurs : sans --max-warnings=0,
  # les avertissements (variable inutilisée…) passeraient au vert.
  if [ "$script" = lint ] && [[ "$cmd" == *eslint* ]] && [[ "$cmd" != *max-warnings* ]]; then
    report+="⚠️  $label — ajouter --max-warnings=0 au script \"lint\" (les avertissements ne bloquent pas)"$'\n'
    failed=1
    continue
  fi

  start=$(date +%s)
  CI=true with_timeout "$timeout_s" "$pm" run "$script" >"$log" 2>&1
  code=$?
  elapsed=$(( $(date +%s) - start ))
  if [ $code -eq 0 ]; then
    report+="✅ $label (${elapsed}s)"$'\n'
  elif [ $code -eq 124 ]; then
    report+="⏱️  $label — arrêté après ${timeout_s}s : ne se termine pas (mode watch ? serveur lancé ?) — journal : $log"$'\n'
    failed_logs+=("$log")
    failed=1
  else
    report+="❌ $label — journal : $log"$'\n'
    failed_logs+=("$log")
    failed=1
  fi
done

# ── Rapport ───────────────────────────────────────────────────────────
echo "Vérification de $(pwd) (gestionnaire : $pm)"
echo
printf '%s' "$report"
echo
if [ $failed -eq 0 ]; then
  echo "RÉSULTAT : tout est vert."
  # Tampon lu par le hook Stop (require-verification) : ce site est vérifié à cette date.
  # Seulement pour les sites du dépôt (sites/<identifiant>).
  root="$(git -C "$(dirname "$0")" rev-parse --show-toplevel 2>/dev/null)"
  if [ -n "$root" ] && [ "$(dirname "$(pwd)")" = "$root/sites" ]; then
    mkdir -p "$root/.claude/state/verifier" && touch "$root/.claude/state/verifier/$(basename "$(pwd)").ok"
  fi
else
  echo "RÉSULTAT : échec."
  for log in "${failed_logs[@]}"; do
    echo; echo "── $(basename "$log" .log) : 40 dernières lignes ──"
    tail -n 40 "$log"
  done
fi
exit $failed

#!/bin/bash
# Hook Stop : empêche l'agent de rendre la main tant qu'un site de sites/ a été
# modifié depuis sa dernière vérification réussie (/verifier).
#
# /verifier dépose un tampon .claude/state/verifier/<site>.ok quand tout est vert ;
# un site dont un fichier est plus récent que son tampon (ou sans tampon) est
# « non vérifié ».
#
# Anti-boucle : si l'agent a déjà été relancé par ce hook (stop_hook_active),
# on le laisse s'arrêter et on prévient l'utilisateur, plutôt que de bloquer
# indéfiniment sur une vérification impossible.

input=$(cat)
root="${CLAUDE_PROJECT_DIR:-$(pwd)}"
state="$root/.claude/state/verifier"

unverified=()
for site in "$root"/sites/*/; do
  site="${site%/}"
  [ -f "$site/package.json" ] || continue
  name="$(basename "$site")"
  stamp="$state/$name.ok"
  if [ ! -f "$stamp" ]; then
    unverified+=("$name")
    continue
  fi
  # Fichiers modifiés après le tampon, hors dépendances, builds et fichiers régénérés
  changed=$(find "$site" \( -name node_modules -o -name .next -o -name .git \) -prune -o \
    -type f -newer "$stamp" ! -name next-env.d.ts ! -name '*.tsbuildinfo' ! -name .DS_Store \
    -print -quit 2>/dev/null)
  [ -n "$changed" ] && unverified+=("$name")
done

[ ${#unverified[@]} -eq 0 ] && exit 0

list=$(printf 'sites/%s, ' "${unverified[@]}"); list="${list%, }"

if printf '%s' "$input" | grep -Eq '"stop_hook_active"[[:space:]]*:[[:space:]]*true'; then
  printf '{"systemMessage": "⚠️ Site(s) modifié(s) mais non vérifié(s) : %s. Lancer /verifier avant de considérer le travail terminé."}\n' "$list"
  exit 0
fi

echo "Site(s) modifié(s) depuis la dernière vérification : $list. Lance /verifier sur chacun avant de rendre la main. Si la vérification est impossible ou demande une décision de l'utilisateur, explique-le." >&2
exit 2

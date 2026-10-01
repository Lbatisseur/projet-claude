#!/bin/bash
# Hook Stop : empêche l'agent de rendre la main tant qu'un site de sites/ a été
# modifié depuis sa dernière vérification réussie (/verifier).
#
# /verifier dépose un tampon .claude/state/verifier/<site>.ok quand tout est vert,
# qui contient l'empreinte du site (liste de ses fichiers et de leurs tailles).
# Un site est « non vérifié » s'il n'a pas de tampon, si un fichier est plus récent
# que le tampon, ou si son empreinte a changé : un fichier supprimé, renommé ou
# copié avec sa date d'origine ne rend aucun fichier plus récent.
#
# Usage annexe : require-verification.sh --empreinte <dossier-du-site>
# affiche l'empreinte (appelé par /verifier pour écrire le tampon).
#
# Anti-boucle : si l'agent a déjà été relancé par ce hook (stop_hook_active),
# on le laisse s'arrêter et on prévient l'utilisateur, plutôt que de bloquer
# indéfiniment sur une vérification impossible.

# Empreinte d'un site : chemins et tailles de ses fichiers, hors dépendances,
# builds et fichiers régénérés. Seules les métadonnées sont lues, jamais le contenu.
empreinte() {
  (cd "$1" 2>/dev/null && find . \( -name node_modules -o -name .next -o -name .git \) -prune -o \
    -type f ! -name next-env.d.ts ! -name '*.tsbuildinfo' ! -name .DS_Store -print0 2>/dev/null |
    xargs -0 stat -f '%z %N' 2>/dev/null | LC_ALL=C sort | shasum -a 256 | cut -d' ' -f1)
}

if [ "$1" = "--empreinte" ]; then
  empreinte "$2"
  exit 0
fi

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
  [ -n "$changed" ] && { unverified+=("$name"); continue; }
  # Empreinte différente : fichier ajouté, supprimé ou renommé.
  # (Tampon vide = ancien format sans empreinte : seule la date compte.)
  expected=$(cat "$stamp" 2>/dev/null)
  [ -n "$expected" ] && [ "$expected" != "$(empreinte "$site")" ] && unverified+=("$name")
done

[ ${#unverified[@]} -eq 0 ] && exit 0

list=$(printf 'sites/%s, ' "${unverified[@]}"); list="${list%, }"

if printf '%s' "$input" | grep -Eq '"stop_hook_active"[[:space:]]*:[[:space:]]*true'; then
  printf '{"systemMessage": "⚠️ Site(s) modifié(s) mais non vérifié(s) : %s. Lancer /verifier avant de considérer le travail terminé."}\n' "$list"
  exit 0
fi

echo "Site(s) modifié(s) depuis la dernière vérification : $list. Lance /verifier sur chacun avant de rendre la main. Si la vérification est impossible ou demande une décision de l'utilisateur, explique-le." >&2
exit 2

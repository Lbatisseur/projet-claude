#!/bin/bash
# Hook PreToolUse (Bash) : bloque les commandes qui détruisent des fichiers ou du
# travail non enregistré, sans passer par la Corbeille macOS.
#
# Filet de sécurité contre les erreurs, pas une protection absolue : une commande
# volontairement camouflée (ex. $(echo rm)) peut passer. Détection par motifs sur
# la commande brute : un mot interdit dans du texte (heredoc, echo) bloque aussi.

input=$(cat)

# Chaque règle : motif (regex étendue) | explication et alternative
rules=(
  '(^|[^[:alnum:]_.-])(rm|rmdir|unlink|shred|srm)([[:space:]"]|$)|suppression définitive (rm, rmdir, unlink, shred, srm)'
  '[[:space:]]-delete([[:space:]"]|$)|find -delete'
  'git[[:space:]]+clean([[:space:]]|$)|git clean efface les fichiers non suivis : les lister avec git status, puis les mettre à la Corbeille'
  'git[[:space:]]+reset[[:space:]]+([^;&|]*[[:space:]])?--hard|git reset --hard efface les modifications non commitées : utiliser git stash'
  'git[[:space:]]+checkout[[:space:]]+([^;&|]*[[:space:]])?--[[:space:]]|git checkout -- <fichiers> efface les modifications : utiliser git stash'
  'git[[:space:]]+restore[[:space:]]+([^;&|]*[[:space:]])?(\.|[^-[:space:];&|][^[:space:];&|]*)([[:space:]]|$)|git restore efface les modifications (sauf --staged seul) : utiliser git stash'
  'rsync[[:space:]][^;&|]*--delete|rsync --delete supprime des fichiers à la destination'
  '(^|[^[:alnum:]_-])truncate[[:space:]]+-|truncate vide le contenu d un fichier'
  'os\.(remove|unlink|rmdir|removedirs)[[:space:]]*\(|suppression depuis Python (os.remove…)'
  'shutil\.rmtree|suppression depuis Python (shutil.rmtree)'
  '\.(rm|rmdir|unlink)(Sync)?[[:space:]]*\(|suppression depuis Node (fs.rm, fs.unlink…)'
  'Path\([^)]*\)\.unlink|\.unlink\(\)|suppression depuis Python (Path.unlink)'
)

# git restore --staged (sans --worktree) ne touche qu'à l'index : autorisé
cmd_only=$(printf '%s' "$input" | sed -E 's/git[[:space:]]+restore[[:space:]]+--staged([[:space:]]+[^-;&|][^;&|]*)?//g')

for rule in "${rules[@]}"; do
  # Le motif peut contenir des | : l'explication est après le dernier |
  reason="${rule##*|}"
  pattern="${rule%|"$reason"}"
  if printf '%s' "$cmd_only" | grep -Eq -- "$pattern"; then
    echo "BLOQUÉ : $reason." >&2
    echo "Pour supprimer un fichier, le mettre à la Corbeille : osascript -e 'tell application \"Finder\" to delete POSIX file \"/chemin/absolu\"'" >&2
    exit 2
  fi
done
exit 0

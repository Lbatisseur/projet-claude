#!/bin/bash
# Hook PreToolUse (Bash) : bloque les commandes qui détruisent des fichiers ou du
# travail non enregistré, sans passer par la Corbeille macOS.
#
# Filet de sécurité contre les erreurs, pas une protection absolue : une commande
# volontairement camouflée (ex. $(echo rm)) peut passer. Détection par motifs sur
# la commande brute : un mot interdit dans du texte (heredoc, echo) bloque aussi.

input=$(cat)

# Analyser la commande elle-même, pas le JSON brut de l'événement : dans le JSON,
# une tabulation s'écrit \t (« rm\tf » échappait au motif) et la description de
# la commande, qui peut citer un mot interdit, ne doit pas compter.
command=$(printf '%s' "$input" | node -e '
  let s = "";
  process.stdin.on("data", (d) => (s += d)).on("end", () => {
    try { process.stdout.write(String(JSON.parse(s)?.tool_input?.command ?? "")); }
    catch { process.stdout.write(s); }
  });' 2>/dev/null) || command="$input"

# Chaque règle : motif (regex étendue) | explication et alternative
rules=(
  '(^|[^[:alnum:]_.-])(rm|rmdir|unlink|shred|srm)([[:space:]]|$)|suppression définitive (rm, rmdir, unlink, shred, srm)'
  '[[:space:]]-delete([[:space:]]|$)|find -delete'
  'git[[:space:]]+clean([[:space:]]|$)|git clean efface les fichiers non suivis : les lister avec git status, puis les mettre à la Corbeille'
  'git[[:space:]]+reset[[:space:]]+([^;&|]*[[:space:]])?--hard|git reset --hard efface les modifications non commitées : utiliser git stash'
  'git[[:space:]]+checkout[[:space:]]+([^;&|]*[[:space:]])?--[[:space:]]|git checkout -- <fichiers> efface les modifications : utiliser git stash'
  'git[[:space:]]+checkout[[:space:]]+([^;&|]*[[:space:]])?(\.|-f|--force)([[:space:]]|$)|git checkout . (ou -f) efface les modifications : utiliser git stash'
  'git[[:space:]]+stash[[:space:]]+(drop|clear)([[:space:]]|$)|git stash drop/clear supprime les sauvegardes de stash, le filet de sécurité'
  'git[[:space:]]+branch[[:space:]]+([^;&|]*[[:space:]])?(-D|--delete[[:space:]]+--force|-d[[:space:]]+-f)([[:space:]]|$)|git branch -D supprime une branche même non fusionnée : utiliser git branch -d, qui refuse si du travail serait perdu'
  'git[[:space:]]+push[[:space:]]+([^;&|]*[[:space:]])?(--force|-f)([[:space:]]|$)|git push --force écrase l historique distant : à faire par l utilisateur'
  'git[[:space:]]+restore[[:space:]]+([^;&|]*[[:space:]])?(\.|[^-[:space:];&|][^[:space:];&|]*)([[:space:]]|$)|git restore efface les modifications (sauf --staged seul) : utiliser git stash'
  'rsync[[:space:]][^;&|]*--delete|rsync --delete supprime des fichiers à la destination'
  '(^|[^[:alnum:]_-])truncate[[:space:]]+-|truncate vide le contenu d un fichier'
  'os\.(remove|unlink|rmdir|removedirs)[[:space:]]*\(|suppression depuis Python (os.remove…)'
  'shutil\.rmtree|suppression depuis Python (shutil.rmtree)'
  '\.(rm|rmdir|unlink)(Sync)?[[:space:]]*\(|suppression depuis Node (fs.rm, fs.unlink…)'
  'Path\([^)]*\)\.unlink|\.unlink\(\)|suppression depuis Python (Path.unlink)'
  'File\.delete|FileUtils\.rm|suppression depuis Ruby (File.delete, FileUtils.rm…)'
  '(^|[^[:alnum:]_.-])rimraf([[:space:]]|$)|rimraf est un rm -rf'
)

# Commandes qui ne touchent qu'à l'index git, jamais aux fichiers : autorisées.
# - git restore --staged, sans --worktree (-W)
# - git rm --cached (le fichier reste sur le disque)
cmd_only=$(printf '%s' "$command" | sed -E \
  -e '/git[[:space:]]+restore[[:space:]][^;&|]*(--worktree|-W)/!s/git[[:space:]]+restore[[:space:]]+--staged([[:space:]]+[^-;&|][^;&|]*)?//g' \
  -e 's/git[[:space:]]+rm[[:space:]]+([^;&|]*[[:space:]])?--cached([[:space:]][^;&|]*)?//g')

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

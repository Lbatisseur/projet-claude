# Hooks

Un **hook** est une commande que Claude Code exécute automatiquement à un moment
précis de son cycle de vie. Contrairement à une consigne écrite dans `CLAUDE.md`,
l'agent ne peut pas l'oublier ni la contourner : c'est Claude Code qui le lance.

Les hooks du projet sont déclarés dans [`.claude/settings.json`](../.claude/settings.json)
et leurs scripts rangés dans [`.claude/hooks/`](../.claude/hooks/).

## Deux familles

| Famille | Effet | Exemple |
|---|---|---|
| **Non bloquant** | Observe ou signale, n'empêche rien | Jouer un son en fin de tâche |
| **Bloquant** | Peut refuser une action (code de sortie `2`) | Interdire l'écriture d'un fichier `.env` |

Règle du projet : on commence par des hooks non bloquants, et une règle ne devient
bloquante que lorsqu'une consigne n'a pas suffi.

## Hooks en place

### Notifications sonores (non bloquant)

| Événement | Moment | Son |
|---|---|---|
| `Stop` | Claude a terminé sa réponse | Glass |
| `Notification` | Claude attend une action (autorisation, question) | Funk |

- Script : [`notify-sound.sh`](../.claude/hooks/notify-sound.sh)
- **Pourquoi** : en travail agentique, les tâches durent plusieurs minutes. Le son
  permet de faire autre chose et d'être prévenu quand l'agent rend la main, sans
  surveiller le terminal. Deux sons distincts séparent « c'est fini » de « j'ai besoin de toi ».
- **Robustesse** : le script sort toujours avec le code `0` et joue le son en
  arrière-plan : un son manquant ne peut ni bloquer ni ralentir la session.

### Suppression via la Corbeille (bloquant, global)

Configuré dans les réglages utilisateur (`~/.claude/settings.json`), donc hors du dépôt
pour l'instant ; il sera versionné dans le projet à l'étape 4.

Un hook `PreToolUse` sur l'outil `Bash` refuse, avec la raison et une alternative :

| Catégorie | Commandes bloquées |
|---|---|
| Suppression directe | `rm`, `rmdir`, `unlink`, `shred`, `srm`, `find -delete`, `git rm` |
| Git destructif | `git clean`, `git reset --hard`, `git checkout -- <fichiers>`, `git restore <fichiers>` |
| Autres langages | `os.remove`, `shutil.rmtree`, `Path.unlink` (Python), `fs.rm`, `fs.unlink` (Node) |
| Divers | `rsync --delete`, `truncate` |

- **Pourquoi** : une suppression par `rm` ou un `git reset --hard` est définitive.
  Avec la Corbeille ou `git stash`, une erreur de l'agent reste réparable.
- **Robustesse** : une entrée vide ou un JSON invalide ne bloque rien (code `0`) :
  un garde-fou ne doit jamais casser la session.
- **Testé** sur 35 commandes à bloquer et 23 commandes légitimes (`git checkout main`,
  `git reset --soft`, classe Tailwind `truncate`…) : 35/35 bloquées, 23/23 autorisées.

**Limites assumées.** La détection se fait par motifs sur le texte de la commande :

- une commande **volontairement camouflée** (`r""m`, `$(echo rm)`) passe : ce hook
  protège des erreurs, pas d'un agent malveillant ;
- la **réécriture par redirection** (`> fichier`) passe : la bloquer empêcherait de
  créer des fichiers ;
- une option placée avant la sous-commande git (`git -C dossier clean`) passe ;
- à l'inverse, un mot interdit présent dans du texte (heredoc, `echo`) bloque la
  commande : écrire ce texte avec l'outil d'écriture de fichiers plutôt qu'en shell.

## Gérer les hooks

- `/hooks` dans Claude Code : voir, modifier ou désactiver les hooks.
- Tester un script à la main : `echo '{}' | .claude/hooks/notify-sound.sh Glass`

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

Configuré dans les réglages utilisateur (`~/.claude/settings.json`), donc hors du dépôt.
Un hook `PreToolUse` sur l'outil `Bash` refuse `rm`, `rmdir`, `unlink`, `shred`, `srm`
et `find -delete`, et indique à l'agent d'utiliser la Corbeille macOS à la place.
Il sera versionné dans le projet à l'étape 4.

## Gérer les hooks

- `/hooks` dans Claude Code : voir, modifier ou désactiver les hooks.
- Tester un script à la main : `echo '{}' | .claude/hooks/notify-sound.sh Glass`

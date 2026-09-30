# Hooks

Un **hook** est une commande que Claude Code exécute automatiquement à un moment
précis de son cycle de vie. Contrairement à une consigne écrite dans `CLAUDE.md`,
l'agent ne peut pas l'oublier ni la contourner : c'est Claude Code qui le lance.

Les hooks du projet sont déclarés dans [`.claude/settings.json`](../.claude/settings.json)
et leurs scripts rangés dans [`.claude/hooks/`](../.claude/hooks/). Ils reçoivent
l'événement en JSON sur leur entrée standard et répondent par leur code de sortie.

## Deux familles

| Famille | Effet | Exemple |
|---|---|---|
| **Non bloquant** | Observe ou signale, n'empêche rien | Jouer un son en fin de tâche |
| **Bloquant** | Peut refuser une action (code de sortie `2`, raison renvoyée à l'agent) | Interdire la lecture d'un fichier `.env` |

Règle du projet : on commence par des hooks non bloquants, et une règle ne devient
bloquante que lorsqu'une consigne n'a pas suffi. Les garde-fous portent sur les
moments irréversibles (écrire, supprimer, exposer un secret, rendre la main), pas
sur la lecture ordinaire.

## Vue d'ensemble

| Hook | Événement | Famille | Protège contre |
|---|---|---|---|
| [`protect-secrets.mjs`](../.claude/hooks/protect-secrets.mjs) | `PreToolUse` (lecture, écriture, recherche, shell, outils MCP) | Bloquant | La fuite ou l'écrasement d'un secret |
| [`block-permanent-delete.sh`](../.claude/hooks/block-permanent-delete.sh) | `PreToolUse` (shell) | Bloquant | Une perte de données irréversible |
| [`require-verification.sh`](../.claude/hooks/require-verification.sh) | `Stop` | Bloquant | Un site rendu sans avoir été vérifié |
| [`notify-sound.sh`](../.claude/hooks/notify-sound.sh) | `Stop`, `Notification` | Non bloquant | Devoir surveiller le terminal |

Principe commun : **un garde-fou ne casse jamais la session.** Une entrée vide ou
un JSON invalide ne bloque rien, et chaque blocage explique la raison et l'alternative.

## Protection des secrets (bloquant)

Refuse tout accès de l'agent aux fichiers secrets : `.env`, `.env.local`,
`.env.production`…, et les clés `*.pem` / `*.key`. Seuls les modèles documentés
(`.env.example`, `.env.sample`, `.env.template`) restent accessibles.

| Voie d'accès | Exemples bloqués |
|---|---|
| Outils de fichiers | `Read`, `Write`, `Edit`, `MultiEdit`, `NotebookEdit` sur `.env.local` |
| Recherche | `Grep` dans `.env.local` ou avec le filtre `.env*`, `Glob` sur `**/.env*` |
| Outils MCP ([navigateur](mcp.md)) | Envoi de `.env.local` dans une page, capture enregistrée sous `.env`, URL `file://…/%2Eenv` |
| Shell | `cat .env`, `source .env`, `cp .env.example .env.local`, `echo … >> .env.local` |

- **Pourquoi** : les clés Stripe donnent accès à l'argent des clients. Un secret lu
  par l'agent se retrouve dans la conversation, donc hors de la machine. L'agent
  documente les variables dans `.env.example` ; l'utilisateur renseigne les valeurs.
- **Écrit en Node** : il doit analyser proprement le JSON de chaque outil.
- **Limites** : un `Grep` sur un dossier entier ne lit pas les `.env`, car ils sont
  exclus par `.gitignore` et ignorés par la recherche ; une commande qui construit le
  nom du fichier (`cat .e""nv`) n'est pas reconnue ; à l'inverse, un nom de fichier
  secret cité dans du texte (message de commit, `echo`) bloque la commande : écrire
  ce texte dans un fichier avec l'outil d'écriture, puis `git commit -F <fichier>`.
- **Outils MCP** : chaque serveur nomme ses paramètres à sa façon. Le hook examine
  les champs qui désignent un fichier (`path`, `paths`, `file_path`, `filename`…) et
  les URL `file://`, où qu'ils soient dans l'argument ; le texte libre (saisie dans
  un formulaire, contenu d'un document) n'est pas examiné. Un nouveau serveur qui
  nommerait autrement un chemin de fichier doit être ajouté aux tests.

## Suppression via la Corbeille (bloquant)

Refuse, avec la raison et une alternative :

| Catégorie | Commandes bloquées |
|---|---|
| Suppression directe | `rm`, `rmdir`, `unlink`, `shred`, `srm`, `find -delete`, `git rm` |
| Git destructif | `git clean`, `git reset --hard`, `git checkout -- <fichiers>`, `git restore <fichiers>` |
| Autres langages | `os.remove`, `shutil.rmtree`, `Path.unlink` (Python), `fs.rm`, `fs.unlink` (Node) |
| Divers | `rsync --delete`, `truncate` |

- **Pourquoi** : une suppression par `rm` ou un `git reset --hard` est définitive.
  Avec la Corbeille ou `git stash`, une erreur de l'agent reste réparable.
- **Partout sur la machine** : le script du dépôt est la seule version de référence.
  Les réglages utilisateur (`~/.claude/settings.json`) l'appellent via un lien
  symbolique `~/.claude/hooks/block-permanent-delete.sh`, pour protéger aussi les
  autres projets. Dans ce dépôt, il est donc évalué deux fois, avec le même verdict.

**Limites assumées.** La détection se fait par motifs sur le texte de la commande :

- une commande **volontairement camouflée** (`r""m`, `$(echo rm)`) passe : ce hook
  protège des erreurs, pas d'un agent malveillant ;
- la **réécriture par redirection** (`> fichier`) passe : la bloquer empêcherait de
  créer des fichiers ;
- une option placée avant la sous-commande git (`git -C dossier clean`) passe ;
- à l'inverse, un mot interdit présent dans du texte (heredoc, `echo`) bloque la
  commande : écrire ce texte avec l'outil d'écriture de fichiers plutôt qu'en shell.

## Vérification obligatoire des sites (bloquant, `Stop`)

Empêche l'agent de rendre la main tant qu'un site de `sites/` a été modifié depuis
sa dernière vérification réussie.

- Quand `/verifier` est entièrement vert, il dépose un tampon
  `.claude/state/verifier/<site>.ok` (exclu de git).
- À chaque fin de tour, le hook cherche, pour chaque site, un fichier plus récent
  que son tampon, en ignorant `node_modules`, `.next` et les fichiers régénérés.
  Un site sans tampon est considéré comme non vérifié.
- Si un site est non vérifié, le hook bloque la fin du tour (code `2`) et demande
  à l'agent de lancer `/verifier`.
- **Anti-boucle** : si l'agent a déjà été relancé par ce hook (`stop_hook_active`),
  il le laisse terminer et affiche un avertissement à l'utilisateur. Sinon, une
  vérification impossible (dépendances absentes, décision à prendre) bloquerait
  indéfiniment.
- **Pourquoi** : c'est la règle « ne jamais déclarer terminée une modification sans
  `/verifier` » de `CLAUDE.md`, transformée de conseil en obligation.
- **À savoir** : une modification faite par l'utilisateur lui-même rend aussi le site
  non vérifié ; l'agent le vérifiera à la fin de son tour suivant.

## Notifications sonores (non bloquant)

| Événement | Moment | Son |
|---|---|---|
| `Stop` | Claude a terminé sa réponse | Glass |
| `Notification` | Claude attend une action (autorisation, question) | Funk |

- **Pourquoi** : en travail agentique, les tâches durent plusieurs minutes. Le son
  permet de faire autre chose et d'être prévenu quand l'agent rend la main.
- **Robustesse** : le script sort toujours avec le code `0` et joue le son en
  arrière-plan : un son manquant ne peut ni bloquer ni ralentir la session.

## Tests

Chaque hook bloquant a ses tests automatisés dans [`tests/hooks/`](../tests/hooks/),
sans dépendance à installer :

```bash
node --test "tests/**/*.test.mjs"
```

| Hook | Tests | Contenu |
|---|---|---|
| `protect-secrets` | 67 | 36 accès à bloquer (dont 13 via MCP), 27 à laisser passer (dont 9 via MCP), 4 entrées invalides |
| `block-permanent-delete` | 66 | 35 commandes à bloquer, 23 légitimes, 5 limites connues, 3 entrées invalides |
| `require-verification` | 9 | Sites vérifiés, modifiés, sans tampon, plusieurs sites, anti-boucle… |

Les tests ont été validés par **sabotage** : un hook modifié pour tout laisser
passer fait échouer ses tests de blocage (23 pour `protect-secrets`, puis 13 pour
son extension aux outils MCP, 4 pour `require-verification`). Un test qui ne peut pas échouer ne prouve rien.

## Gérer les hooks

- `/hooks` dans Claude Code : voir, modifier ou désactiver les hooks.
- Tester un hook à la main : `echo '{"tool_name":"Read","tool_input":{"file_path":".env"}}' | .claude/hooks/protect-secrets.mjs`

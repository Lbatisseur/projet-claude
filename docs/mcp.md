# Serveurs MCP

Le **MCP** (*Model Context Protocol*) est une prise standard qui branche un
programme externe sur Claude Code. Le programme, appelé **serveur MCP**, apporte de
nouveaux outils à l'agent : piloter un navigateur, interroger Stripe, etc.

Les serveurs du projet sont déclarés dans [`.mcp.json`](../.mcp.json), à la racine.
Au premier lancement, Claude Code demande à l'utilisateur d'**approuver** chaque
serveur : un dépôt cloné ne peut pas exécuter un programme sans accord explicite.

## Skill, hook, sous-agent ou MCP ?

| | Skill | Hook | Sous-agent | Serveur MCP |
|---|---|---|---|---|
| Nature | Une recette | Un garde-fou | Un spécialiste | Un outil |
| Apporte | Une procédure | Une règle imposée | Un regard indépendant | Une capacité nouvelle |
| Exemple | `/verifier` | `protect-secrets` | `relecteur-securite` | Navigateur Playwright |

Un serveur MCP **étend ce que l'agent peut faire**. C'est aussi ce qui le rend
sensible : chaque outil ajouté est un nouveau chemin vers les fichiers et les secrets,
que les garde-fous existants doivent couvrir.

## Serveurs en place

### Navigateur : `playwright`

[Playwright MCP](https://github.com/microsoft/playwright-mcp) (Microsoft) donne à
l'agent un navigateur Chrome qu'il pilote : ouvrir une page, cliquer, remplir un
formulaire, redimensionner la fenêtre, prendre une capture, lire la console et les
requêtes réseau.

**Pourquoi** : les tests et le build vérifient le code, pas ce que voit le visiteur.
Une image manquante (erreur 404) ou un script qui plante dans la page passent le lint,
les types et le build ; le navigateur les voit immédiatement.

Usage : lancer le site (`npm run dev`), puis demander par exemple « ouvre
localhost:3000 en taille mobile et dis-moi s'il y a des erreurs dans la console ».

**Réglages** (dans `.mcp.json`) :

| Réglage | Pourquoi |
|---|---|
| `@playwright/mcp@0.0.83` | Version **figée**. Avec `@latest`, chaque démarrage exécuterait la dernière version publiée, sans relecture : si le paquet était un jour compromis, le code malveillant tournerait sur la machine. On met à jour volontairement |
| `--isolated` | Profil vierge à chaque session : ni cookies ni comptes connectés de l'utilisateur |
| `--headless` | Pas de fenêtre : l'agent travaille en arrière-plan et montre des captures. Retirer l'option pour regarder le navigateur agir |
| `--output-dir .claude/state/playwright` | Captures et journaux dans un dossier ignoré par git |

Choix écartés : **Claude in Chrome** pilote le vrai Chrome de l'utilisateur, avec
ses sessions ouvertes (banque, messagerie) ; trop de pouvoir pour tester un site.
**Chrome DevTools MCP** est plus fort en mesure de performance, à considérer pour
l'audit avant livraison.

## Sécurité : ce que les tests ont révélé

Avant de brancher le navigateur, ses outils ont été essayés hors de Claude Code
(script client MCP) avec un **fichier canari**, un faux secret, pour voir ce qu'ils
laissent réellement passer.

| Essai | Résultat | Parade |
|---|---|---|
| Ouvrir `file:///…/canari.txt` | Refusé par le serveur | Réglage par défaut, conservé (`--allow-unrestricted-file-access` interdit) |
| Envoyer un fichier hors du projet (`browser_file_upload`) | Refusé par le serveur | Idem |
| Envoyer un fichier **du projet**, puis le lire en JavaScript dans la page (`browser_evaluate`) | **Contenu lu** | Hook `protect-secrets` étendu aux outils MCP |
| `browser_run_code_unsafe` : sortir de sa zone protégée en une ligne (`page.constructor.constructor('return process')()`) | **Canari hors du projet lu** : tout le disque est accessible | Outil **interdit** par une règle de permission |

Deux protections en découlent :

1. **Règle de permission** dans [`.claude/settings.json`](../.claude/settings.json) :
   `"deny": ["mcp__playwright__browser_run_code_unsafe"]`. Une interdiction l'emporte
   sur toute autorisation, et l'outil n'est même plus proposé à l'agent. Un hook ne
   suffirait pas : il faudrait deviner, dans du code arbitraire, s'il lit un secret.
2. **Hook `protect-secrets`** appliqué à tous les outils `mcp__*` : il bloque un
   fichier secret passé comme chemin (envoi, glisser-déposer, capture ou journal
   enregistré sous ce nom) ou comme URL `file://`, y compris encodée (`%2Eenv`).
   Voir [hooks.md](hooks.md#protection-des-secrets-bloquant).

Les **sites clients** étant dans le projet (`sites/`), leurs `.env` sont à la portée
de l'envoi de fichier : sans le hook, le navigateur serait une porte de sortie.

## Tests

| Test | Contenu |
|---|---|
| [`tests/hooks/protect-secrets.test.mjs`](../tests/hooks/protect-secrets.test.mjs) | 13 accès MCP à bloquer, 9 usages normaux à laisser passer |
| [`tests/mcp/config.test.mjs`](../tests/mcp/config.test.mjs) | 6 garanties de configuration : version figée, profil isolé, accès aux fichiers restreint, sorties ignorées par git, outil dangereux interdit, hook actif sur les outils MCP |

Validés par **sabotage** : hook aveugle aux outils MCP (13 échecs), URL non décodée
(2 échecs), interdiction retirée (1 échec), version remise à `@latest` (1 échec).

**Essai réel** dans Claude Code, sur `demo-maison-lumen` :

- page d'accueil parcourue, capture en taille bureau et mobile (390 × 844), console propre ;
- envoi de `.env.local`, capture enregistrée sous `.env`, ouverture de `file://…/%2Eenv.local` : **tous bloqués** par le hook ;
- `browser_run_code_unsafe` absent de la liste des outils ;
- site saboté (image absente, script qui plante) : les **deux** défauts détectés
  (404 dans les requêtes réseau, `TypeError` dans la console), puis sabotage retiré
  et site revérifié avec `/verifier`.

## Gérer les serveurs

- `/mcp` dans Claude Code : état des serveurs, outils disponibles, reconnexion.
- `claude mcp list` dans le terminal : liste et santé des serveurs.
- Un serveur ajouté ou modifié dans `.mcp.json` n'est chargé qu'au **redémarrage**
  de Claude Code (`claude --continue` pour garder la conversation).
- Mettre à jour Playwright MCP : changer la version dans `.mcp.json` après avoir lu
  les notes de version, redémarrer, puis vérifier que les outils n'ont pas changé
  (un nouvel outil peut ouvrir un nouvel accès aux fichiers).

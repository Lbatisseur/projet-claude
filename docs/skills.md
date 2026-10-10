# Skills

Un **skill** est une procédure écrite que Claude Code suit à la demande. Chaque skill
vit dans son propre dossier sous [`.claude/skills/`](../.claude/skills/), avec :

- un fichier `SKILL.md` : un en-tête (nom, description, argument attendu) puis les
  instructions, en langage naturel ;
- éventuellement des scripts ou des modèles de fichiers à côté.

On le lance en tapant `/nom` dans Claude Code. L'agent peut aussi le déclencher de
lui-même quand la situation correspond à la `description` de l'en-tête : c'est
pourquoi cette description dit précisément **quand** utiliser le skill.

## Skill ou hook ?

| | Skill | Hook |
|---|---|---|
| Nature | Une recette : *comment* faire | Un garde-fou : *ce qui doit* arriver |
| Déclenchement | Par l'utilisateur (`/nom`) ou par l'agent | Par Claude Code, sur un événement |
| Contraignant | Non : l'agent peut l'oublier | Oui : l'agent ne peut pas l'éviter |

Un skill conseille, un hook impose. Quand un skill important est régulièrement
oublié, on ajoute un hook pour le rendre obligatoire.

## Principe de conception

Chaque skill sépare deux parties :

- **Le mécanique** va dans un **script** : il fait toujours exactement la même chose
  et se teste à la main, sans l'agent.
- **Le jugement** va dans le **`SKILL.md`** : interpréter un résultat, corriger,
  décider quand s'arrêter et demander.

## Skills en place

### `/verifier`

Contrôle qualité d'un site client avant de déclarer une tâche terminée.

- Fichiers : [`SKILL.md`](../.claude/skills/verifier/SKILL.md),
  [`scripts/verify.sh`](../.claude/skills/verifier/scripts/verify.sh)
- Usage : `/verifier sites/boutique-dupont`
- Le script lance, dans l'ordre, les scripts npm `format:check`, `lint`, `typecheck`,
  `test` et `build`, détecte le gestionnaire de paquets (npm, pnpm, yarn, bun) et
  affiche un rapport ✅ / ❌ / ⏱️ / ⚠️ avec la fin du journal de chaque étape en échec.
- Contrôles préalables avec message clair (JSON invalide, gestionnaire absent,
  dépendances non installées) et limite de temps par étape, qui arrête aussi les
  processus enfants.
- **Pourquoi** : « ça a l'air de marcher » ne suffit pas pour un site qui encaisse
  des paiements. Ce skill définit ce que « terminé » veut dire, de la même façon
  pour chaque site. Il interdit aussi de « tricher » (désactiver un test ou une
  règle) pour obtenir du vert.
- Tester le script sans l'agent : `.claude/skills/verifier/scripts/verify.sh sites/<site>`

#### Campagne de tests

Le skill a été éprouvé sur un vrai projet Next.js 16 (dans un chemin contenant un
espace) en sabotant chaque étape, puis sur des cas limites.

| Scénario | Verdict attendu | Obtenu |
|---|---|---|
| Site sain | ✅ partout, code 0 | ✅ |
| Code mal formaté | ❌ Formatage | ✅ |
| Variable inutilisée | ❌ Lint | ✅ après correctif 1 |
| Erreur de type | ❌ Types (et Build) | ✅ |
| Test faux | ❌ Tests | ✅ |
| `useState` sans `"use client"` (visible au build seulement) | ❌ Build | ✅ |
| Deux erreurs simultanées | ❌ sur les deux étapes | ✅ |
| Page supprimée après un build | ✅ (pas de fausse erreur) | ✅ après correctif 2 |
| Test qui ne se termine jamais | ⏱️, aucun processus survivant | ✅ après correctif 3 |
| JSON invalide · pnpm absent · pas de `node_modules` · dossier inexistant | Message clair, code 2 | ✅ après correctif 4 |
| Journal de 100 000 lignes | Rapport borné (≈ 50 lignes) | ✅ |

Les tests ont révélé quatre défauts, tous corrigés :

1. **Avertissements ESLint ignorés** : ESLint ne sort en erreur que sur les erreurs.
   Le script exige désormais `--max-warnings=0` dans le script `lint`.
2. **Fausse erreur de types** après la suppression d'une page : Next.js garde dans
   `.next/types` des références à l'ancienne page. Le script `typecheck` régénère
   ces types (`next typegen`) avant `tsc`.
3. **Blocage infini** sur un test en mode surveillance : ajout d'une limite de temps
   qui tue tout le groupe de processus.
4. **Messages illisibles** sur un projet mal installé : ajout de contrôles préalables.
5. **Chemin du script vide au premier vrai lancement de `/verifier`** : le `SKILL.md`
   utilisait `$CLAUDE_PROJECT_DIR`, qui n'est définie que pour les hooks. Les tests
   appelaient le script directement et ne pouvaient pas le voir : un skill se teste
   aussi en le lançant réellement depuis Claude Code.

### `/nouveau-site`

Crée la base d'un site : outillage complet, fiche du client, dépôt git, puis
vérification au vert. Les fonctionnalités e-commerce viennent ensuite, avec leurs
propres skills : chaque skill reste petit, testable, et un client n'embarque que
ce dont il a besoin.

- Fichiers : [`SKILL.md`](../.claude/skills/nouveau-site/SKILL.md),
  [`scripts/scaffold.sh`](../.claude/skills/nouveau-site/scripts/scaffold.sh),
  [`templates/`](../.claude/skills/nouveau-site/templates/)
- Usage : `/nouveau-site Boulangerie Martin`

**Ce que le script produit dans `sites/<identifiant>/`** :

| Élément | Détail |
|---|---|
| Projet Next.js 16 | TypeScript, Tailwind, ESLint, App Router, `src/` (version majeure figée : créations reproductibles) |
| Outils de qualité | Prettier (+ tri des classes Tailwind), Vitest, les 5 scripts exigés par `/verifier` |
| `CLAUDE.md` | Fiche du site : client, identité visuelle, écarts de stack justifiés, journal des décisions. Importe `AGENTS.md`, fourni par Next.js, qui renvoie l'agent vers la documentation de la version installée |
| `src/lib/site.ts` | Nom et description du site, en un seul endroit |
| `src/app/layout.tsx`, `globals.css` | Langue `fr`, titre et description tirés de `site.ts`. **Aucune police téléchargée** : police système en attendant l'identité visuelle du client (le modèle Next.js chargeait Geist sans jamais l'afficher, corrigé le 2026-10-01) |
| `src/lib/prix.ts` | Formatage des prix en **centimes entiers** (`0.1 + 0.2 !== 0.3`), avec ses tests |
| `README.md`, `.env.example` | Documentation remise au client ; variables documentées sans valeurs |

**Sites clients et confidentialité** : le dépôt d'outillage est public, le code
d'un client lui appartient. `sites/` est donc exclu du dépôt public ; chaque site
client a son propre dépôt git, publié en **privé** sur GitHub (transférable au
client à la livraison). Seuls les sites de démonstration fictifs (`demo-*`) sont
versionnés publiquement.

**Tests** :

| Scénario | Résultat |
|---|---|
| 8 entrées invalides (majuscules, espaces, tirets en trop, `../../evil`, nom vide, dossier existant) | Refusées, message clair, code 2 |
| Nom piégé (`L'Atelier "Chez Zoé" & Fils`) et description avec `{{NOM}}`, `$HOME`, `` `whoami` `` | Échappés correctement, rien d'exécuté ni de substitué |
| Site démo | Visible par le dépôt public, `/verifier` vert |
| Site client | Dépôt git propre avec un commit, invisible du dépôt public, `.env.example` versionné, `/verifier` vert |
| Lancement réel du skill (`/nouveau-site` puis `/verifier`) | Site `demo-maison-lumen` créé et vert en moins d'une minute |

### `/cadrage`

Établit, avec l'utilisateur, le cahier des charges d'un site avant d'en coder les
fonctionnalités : `sites/<identifiant>/CADRAGE.md`.

- Fichiers : [`SKILL.md`](../.claude/skills/cadrage/SKILL.md),
  [`templates/CADRAGE.md`](../.claude/skills/cadrage/templates/CADRAGE.md),
  [`scripts/check-cadrage.mjs`](../.claude/skills/cadrage/scripts/check-cadrage.mjs)
- Usage : `/cadrage demo-maison-lumen` (après `/nouveau-site`)
- **Pourquoi** : un client décrit ce qu'il veut en vrac. Sans cadrage, l'agent code
  tout ce qui est demandé, dans le désordre, et personne ne sait quand le site est
  « fini ». L'idée vient de la méthode BMAD, qui fait précéder le code d'une phase
  d'analyse : on en garde seulement l'étape légère de recueil du besoin, sans la
  chaîne complète de rôles et de documents de BMAD, trop lourde pour un petit site.

**Déroulé** :

1. **Entretien** en trois tours au plus (le commerce, la vente, le cadre), cinq
   questions par tour, chacune avec une réponse par défaut acceptable d'un mot.
   L'utilisateur relaie souvent le client : une réponse inconnue n'est jamais
   inventée, elle devient une question ouverte `Q-xx`.
2. **Périmètre** : chaque besoin est classé *Lancement*, *Plus tard* ou *Hors
   périmètre*, avec la raison. Le skill défend un lancement petit et soumet ce
   découpage à l'utilisateur avant d'écrire.
3. **Critères d'acceptation** `CA-xx` : au moins un par fonctionnalité du lancement,
   formulé pour être vérifiable par un visiteur ou un test (« le total se met à
   jour sans recharger la page », pas « le panier est pratique »). L'audit avant
   livraison (étape 7) teste le site contre ces critères.
4. **Obligations légales** de la vente en ligne en France (mentions légales, CGV,
   rétractation, RGPD, cookies, médiateur, prix TTC, bouton de commande), chacune
   avec un statut. Le skill recense, il ne rédige pas de texte juridique.
5. **Contrôle** par le script, puis mise à jour de la fiche `CLAUDE.md` du site et
   `/verifier`.

**Le script de contrôle** vérifie la forme, pas le fond : sections présentes et
remplies, identifiants uniques, chaque fonctionnalité du lancement couverte par un
critère, aucun critère sur une fonctionnalité reportée, toutes les obligations
légales statuées, aucun renvoi vers un identifiant inexistant, et aucune question
bloquante ouverte sur un cadrage marqué « Validé par le client ». Le fond (un bon
découpage, des critères utiles) relève du jugement de l'agent et de la relecture
de l'utilisateur.

**Tests** : 35 tests automatisés
([`tests/skills/check-cadrage.test.mjs`](../tests/skills/check-cadrage.test.mjs)).
Un cadrage de référence complet est abîmé d'une seule façon par test (28 défauts
différents), plus les cas acceptés (fins de ligne Windows, `|` échappé dans une
cellule, cadrage validé) et les erreurs d'usage.

Validation par sabotage : 8 versions cassées du script.

| Sabotage | Détecté |
|---|---|
| Couverture des fonctionnalités, statut « Validé » laxiste, commentaires du modèle comptés comme contenu, renvois non contrôlés, question bloquante ignorée, critère sur une fonctionnalité reportée | ✅ |
| `\|` échappé coupé comme séparateur | ❌ puis ✅ : le cas de test était placé dans un tableau où une colonne de trop ne change rien. Il a été déplacé dans le tableau des questions, où il décale la colonne « Bloquante » |
| Fins de ligne Windows non gérées | Sans effet : les cellules et titres sont déjà nettoyés par `trim()`, le script résiste deux fois |

**Lancement réel** sur `demo-maison-lumen`, l'utilisateur jouant la cliente : un
cadrage de 8 fonctionnalités, 23 critères et 7 questions ouvertes, conforme du
premier coup. Ce lancement a révélé trois défauts, que les tests du script ne
pouvaient pas voir :

1. **Le hook de vérification bloquait l'entretien** : le skill créait `CADRAGE.md`
   dès le début. Le site était donc modifié, et le hook `require-verification`
   exigeait `/verifier` à la fin de chaque tour de questions. Le fichier n'est
   plus créé qu'après l'entretien.
2. **Un statut légal manquait** : le prix TTC et le bouton de commande ne sont pas
   des textes à fournir, c'est le site qui les respecte. Ajout du statut
   `À intégrer`, couvert par un critère d'acceptation.
3. **`/verifier` échouait sur le formatage** : Prettier vérifie aussi les fichiers
   Markdown du site. Le skill formate désormais `CADRAGE.md` et la fiche.

### À venir

- `/livrer` : préparer la mise en ligne et la livraison au client
- Fonctionnalités e-commerce : catalogue, panier, paiement Stripe

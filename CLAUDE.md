# CLAUDE.md

Consignes lues par Claude Code au début de chaque session. Garder ce fichier court :
le détail va dans `docs/`.

## Le projet

Un environnement Claude Code (skills, hooks, sous-agents, workflows) pour créer
rapidement des **sites e-commerce sur mesure** pour des clients.

- Claude écrit le code ; l'utilisateur relit et valide.
- L'utilisateur débute en développement web (formation 42, langage C) : expliquer
  les choix et les notions web nouvelles, en français, simplement.
- Le dépôt sert de portfolio (entretiens) : il doit rester propre et documenté.

## Stack des sites clients

Stack **par défaut**, à adapter aux besoins de chaque client. Tout écart est
justifié et noté dans la documentation du site concerné.

- **Next.js** (App Router) + **TypeScript** (mode strict)
- **Tailwind CSS** pour le style
- **Stripe** pour le paiement
- Base de données : choisie selon le site

## Organisation du dépôt

| Dossier | Contenu |
|---|---|
| `.claude/` | Réglages, hooks, skills et sous-agents du projet |
| `docs/` | Documentation détaillée (un fichier par sujet) |
| `sites/` | Un dossier par site client (à venir) |

## Règles

- **Suppressions** : jamais de `rm`. Toujours la Corbeille macOS :
  `osascript -e 'tell application "Finder" to delete POSIX file "/chemin/absolu"'`
  (un hook global bloque les suppressions définitives).
- **Secrets** : ne jamais lire, écrire ni committer de fichier `.env`. Documenter
  les variables nécessaires dans `.env.example`, sans valeurs réelles.
- **Commits** : format [Conventional Commits](https://www.conventionalcommits.org/fr/),
  en français, un changement logique par commit (`feat:`, `fix:`, `docs:`, `chore:`…).
  Ne committer que sur demande de l'utilisateur.
- **Vérification** : ne jamais déclarer terminée une modification de code d'un site
  sans avoir lancé `/verifier` sur ce site et obtenu du vert.
- **Documentation** : chaque skill, hook ou sous-agent ajouté est documenté dans
  `docs/` et la feuille de route du `README.md` est mise à jour.

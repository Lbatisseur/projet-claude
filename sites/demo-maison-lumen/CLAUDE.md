@AGENTS.md

# Fiche du site : Maison Lumen

Contexte propre à ce site. Les règles générales sont dans le `CLAUDE.md` à la
racine du dépôt d'outillage ; ce fichier les complète pour ce client.

## Client

|                     |                                        |
| ------------------- | -------------------------------------- |
| Nom commercial      | Maison Lumen                           |
| Identifiant du site | `demo-maison-lumen`                    |
| Activité            | Bougies artisanales parfumées          |
| Créé le             | 2026-09-29                             |
| Type                | Démo (versionnée dans le dépôt public) |

Particuliers de 25 à 55 ans, qui achètent pour eux ou pour offrir, surtout sur
téléphone. Ton chaleureux et artisanal. Mise en ligne visée : 15 novembre 2026.

Cahier des charges : [`CADRAGE.md`](CADRAGE.md) (périmètre, critères d'acceptation,
questions ouvertes).

## Identité visuelle

À définir avec le client : couleurs, typographies, logo.

## Choix techniques

Stack par défaut : Next.js (App Router) · TypeScript strict · Tailwind CSS ·
Prettier · ESLint strict · Vitest. Paiement : Stripe (ajouté quand nécessaire).

Écarts par rapport à la stack par défaut, avec leur justification :

- **Base de données** pour le stock uniquement : les quantités changent à chaque
  commande, et le site hébergé ne peut pas modifier ses propres fichiers. Le
  catalogue reste un fichier du code (voir `CADRAGE.md`, Choix techniques).
- **Service d'envoi d'e-mails** pour les confirmations de commande.

## Conventions du site

- Prix en **centimes entiers** ; affichage via `formaterPrix` (`src/lib/prix.ts`).
- Nom et description du site centralisés dans `src/lib/site.ts`.
- Variables d'environnement documentées dans `.env.example` (sans valeurs réelles).
- Avant de déclarer une tâche terminée : `/verifier` sur ce dossier.

## En ligne

Tenu à jour par `/livrer` : une ligne par étape, remplacée à chaque redéploiement.

| Étape   | Adresse                              | Hébergeur                                           | Déploiement                        | Commit    | Date       | Vérification                                                                       |
| ------- | ------------------------------------ | --------------------------------------------------- | ---------------------------------- | --------- | ---------- | ---------------------------------------------------------------------------------- |
| Recette | https://demo-maison-lumen.vercel.app | Vercel, projet `demo-maison-lumen` (offre gratuite) | `dpl_E2qAasvsHqbvo7jZX7apPB72dvfV` | `4799810` | 2026-10-26 | 0 ✅ · 23 ❌ sur 23 : seule la page d'accueil existe, fonctionnalités à développer |

## Versions retenues

Décidées avec l'utilisateur ; `/entretenir` ne signale plus la version majeure
suivante, et demande de réexaminer chaque retenue après 3 mois.

| Paquet        | Reste en | Raison                                                                                                     | Depuis     |
| ------------- | -------- | ---------------------------------------------------------------------------------------------------------- | ---------- |
| `eslint`      | 9        | Trois extensions de la configuration de Next.js (import, jsx-a11y, react) n'acceptent pas encore ESLint 10 | 2026-10-26 |
| `typescript`  | 6        | `typescript-eslint` ne lit pas TypeScript 7 (réécrit) : le lint planterait                                 | 2026-10-26 |
| `@types/node` | 24       | Les types doivent correspondre à la version de Node utilisée (24 LTS)                                      | 2026-10-26 |

## Journal des décisions

| Date       | Décision                                                       | Raison                                                                  |
| ---------- | -------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 2026-09-29 | Création du site avec `/nouveau-site`                          | —                                                                       |
| 2026-10-01 | Page 404 en français (`not-found.tsx`)                         | La page par défaut de Next.js est en anglais                            |
| 2026-10-01 | Texte secondaire en `zinc-400` en mode sombre                  | Contraste 4,10:1 → 7,55:1 (minimum WCAG AA : 4,5:1)                     |
| 2026-10-01 | Polices Geist retirées, police système (Arial)                 | Téléchargées mais jamais affichées ; police à choisir avec le client    |
| 2026-10-10 | Cadrage v1 avec `/cadrage` : 8 fonctionnalités au lancement    | Gestion des produits par la cliente reportée : 4 nouveautés par saison  |
| 2026-10-26 | `vercel.json` : déploiements automatiques depuis GitHub coupés | Le site ne part en ligne que par `/livrer`, après ses contrôles         |
| 2026-10-26 | React 19.3.1, Vitest 5, TypeScript 6, types de Node 24         | Bilan `/entretenir` ; versions essayées sur une copie, `/verifier` vert |

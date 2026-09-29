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

<!-- À compléter au fil du projet : public visé, ton, pages attendues. -->

## Identité visuelle

À définir avec le client : couleurs, typographies, logo.

## Choix techniques

Stack par défaut : Next.js (App Router) · TypeScript strict · Tailwind CSS ·
Prettier · ESLint strict · Vitest. Paiement : Stripe (ajouté quand nécessaire).

Écarts par rapport à la stack par défaut, avec leur justification :

- Aucun pour l'instant.

## Conventions du site

- Prix en **centimes entiers** ; affichage via `formaterPrix` (`src/lib/prix.ts`).
- Nom et description du site centralisés dans `src/lib/site.ts`.
- Variables d'environnement documentées dans `.env.example` (sans valeurs réelles).
- Avant de déclarer une tâche terminée : `/verifier` sur ce dossier.

## Journal des décisions

| Date       | Décision                              | Raison |
| ---------- | ------------------------------------- | ------ |
| 2026-09-29 | Création du site avec `/nouveau-site` | —      |

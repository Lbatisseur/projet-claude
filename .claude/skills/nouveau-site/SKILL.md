---
name: nouveau-site
description: Crée un nouveau site (client ou démo) dans sites/ avec la stack par défaut — Next.js, TypeScript strict, Tailwind, Prettier, ESLint strict, Vitest — sa fiche CLAUDE.md et son dépôt git, puis le valide avec /verifier. À utiliser quand l'utilisateur veut démarrer un site pour un nouveau client ou un site de démonstration.
argument-hint: "[nom commercial du client]"
---

# /nouveau-site

Crée la base d'un site : outillage complet, fiche du client, dépôt git, vérification
au vert. Les fonctionnalités e-commerce (catalogue, panier, paiement) viennent
ensuite, avec leurs propres skills.

## 1. Réunir les informations

Il faut :

| Information | Exemple | Obligatoire |
|---|---|---|
| Nom commercial | Boulangerie Martin | oui |
| Activité, en une phrase | Pains et viennoiseries artisanales à Lyon | oui |
| Type : client réel ou démo | client | oui |
| Public visé, ton, couleurs, pages attendues | — | non, complété plus tard |

Pars de `$ARGUMENTS` et de la conversation. Pose en **un seul message** les
questions sur ce qui manque ; ne demande pas les informations facultatives.

Déduis l'identifiant du nom : minuscules, sans accents, mots séparés par des tirets
(`Boulangerie Martin` → `boulangerie-martin`). Pour une démo, préfixe `demo-`
(`demo-boulangerie`). Si `sites/<identifiant>` existe déjà, propose une variante.

## 2. Créer le site

Le script est `scripts/scaffold.sh`, dans le dossier de ce skill (chemin absolu
indiqué au chargement : « Base directory for this skill »). Appelle-le par ce
chemin absolu, entre guillemets (il contient un espace), avec une limite de temps
de 10 minutes :

```bash
"<dossier-du-skill>/scripts/scaffold.sh" <identifiant> "<Nom commercial>" "<Activité>"
```

Il crée le projet Next.js (version 16), installe Prettier et Vitest, configure les
scripts exigés par `/verifier`, applique les modèles de `templates/` (fiche
`CLAUDE.md`, `README.md`, `src/lib/site.ts`, `src/lib/prix.ts` et son test…), met le
code en forme et, pour un site client, initialise son dépôt git avec un premier commit.

Code de sortie `2` : création impossible, le message dit pourquoi. Corrige la
cause (identifiant invalide, dossier existant…) ou explique-la à l'utilisateur.

## 3. Compléter la fiche du site

Dans `sites/<identifiant>/CLAUDE.md`, ajoute les informations facultatives que
l'utilisateur a données (public, ton, couleurs, pages). Ne touche pas à la ligne
`@AGENTS.md` : elle importe les consignes de Next.js pour sa version installée.

## 4. Vérifier

Lance `/verifier` sur `sites/<identifiant>`. Un site neuf doit être entièrement
vert : sinon, c'est le skill qui est défaillant. Corrige la cause dans les modèles
ou le script, pas seulement dans le site créé.

## 5. Publier le code

- **Site client** : son dépôt git est local. Propose de créer son dépôt GitHub
  **privé**, et attends l'accord de l'utilisateur avant de lancer :
  `gh repo create <identifiant> --private --source="sites/<identifiant>" --push`.
  Si la fiche a été complétée à l'étape 3, commite-la d'abord dans le dépôt du site.
  Ne mentionne jamais le client dans le dépôt public (README, docs, commits).
- **Démo** : elle est versionnée dans le dépôt public ; propose un commit
  `feat(sites): ajoute le site de démonstration <identifiant>`.

## 6. Rendre compte

En quelques lignes : le dossier créé, le type de site, le résultat de `/verifier`,
la commande pour le voir dans le navigateur (`cd sites/<identifiant> && npm run dev`,
puis http://localhost:3000), et la prochaine étape (ajouter le catalogue, le paiement…).

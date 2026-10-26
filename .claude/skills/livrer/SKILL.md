---
name: livrer
description: Met un site en ligne et le tient à jour — étape « recette » (adresse provisoire, paiement en mode test, pour que le client essaie le site) puis « mise en ligne » (vrai domaine, vraies clés Stripe du client), chez l'hébergeur choisi pour ce site dans son CADRAGE.md, avec vérification dans un vrai navigateur après chaque déploiement. À utiliser quand l'utilisateur veut publier un site, le montrer au client, le mettre en production, ou redéployer une nouvelle version.
argument-hint: "[dossier du site] [recette|mise-en-ligne]"
---

# /livrer

Livrer un site, ce n'est pas remettre du code : c'est le **mettre en ligne et le
garder en bonne santé**. L'utilisateur gère chaque site dans la durée ; le client
ne touche jamais au code.

| Étape | Ce qui se passe | Prérequis |
|---|---|---|
| **Recette** | Le site tourne sur une adresse provisoire de l'hébergeur, paiement en **mode test**, pour que le client l'essaie et le valide | Hébergeur choisi, code committé, `/verifier` vert |
| **Mise en ligne** | Vrai domaine, **vraies clés Stripe du client**, nouvelle vérification sur l'adresse définitive | Tous les choix de mise en ligne faits, cadrage validé par le client, recette validée, `/auditer` non 🔴 |

Redéployer une nouvelle version d'un site déjà en ligne suit les mêmes règles que
sa dernière étape (une correction sur un site en production repasse par
`/auditer`).

Trois règles ne souffrent aucune exception :

- **Seul du code committé part en ligne.** On sait toujours quel commit tourne, et
  on peut y revenir.
- **Tu ne vois jamais une clé.** Les clés (Stripe, hébergeur) sont saisies par
  l'utilisateur lui-même, avec le préfixe `!`. Le hook `protect-secrets` bloque les
  commandes qui les recopieraient.
- **Toute action sur un site en ligne est confirmée par l'utilisateur** : le hook
  `confirmer-production` le lui demande. N'essaie jamais de la contourner.

## 1. Choisir le site et l'étape

Pars de `$ARGUMENTS` ou du site dont parle la conversation. Dans la suite, `<site>`
est le **chemin absolu** de son dossier. L'étape vient des arguments ; sinon, lis la
section « En ligne » de la fiche `<site>/CLAUDE.md` : jamais déployé → `recette` ;
recette faite → demande à l'utilisateur si le client l'a validée.

## 2. Prérequis

```bash
node "<dossier-de-ce-skill>/scripts/prerequis.mjs" "<site>" <recette|mise-en-ligne>
```

Code `0` : la dernière ligne donne la procédure à suivre (`PROCÉDURE vercel`).
Code `2` : site invalide, montre le message. Code `1` : traite chaque ❌ :

- **Choix de mise en ligne manquant** (hébergeur, domaine…) : ces choix se font
  **site par site**. Présente les options avec ta recommandation pour *ce* site
  (budget, trafic, autonomie du client) et sa raison ; le tableau des options est
  dans le skill `/cadrage` (étape 2). Note la décision dans la section « Mise en
  ligne » de `CADRAGE.md`, ferme la question ouverte correspondante, ajoute une
  ligne à l'historique, formate le fichier (`npx prettier --write CADRAGE.md`).
- **Aucune procédure pour cet hébergeur** : arrête-toi. Propose de l'écrire avec
  l'utilisateur dans `procedures/<hebergeur>.md`, sur le modèle de `vercel.md`,
  avant de livrer.
- **Code non committé** : propose un commit à l'utilisateur et attends son accord.
- **Cadrage non validé** (mise en ligne) : le client doit le valider d'abord.

Relance le script jusqu'au code `0`.

## 3. Qualité

- **Recette** : `/verifier` sur le site, entièrement vert.
- **Mise en ligne** : `/auditer` sur le site. Verdict 🔴 : arrête-toi, rien ne part
  en ligne. Verdict 🟡 : chaque réserve doit être levée ou acceptée explicitement
  par l'utilisateur ; les points « Avant mise en ligne » doivent être réglés.
  Demande aussi à l'utilisateur si le client a validé la recette, et quand.

## 4. Déployer

Lis `procedures/<procédure>.md` (dans le dossier de ce skill) et suis-la pour
l'étape demandée : connexion, projet, variables d'environnement, déploiement,
domaine.

## 5. Vérifier en ligne

Lance le sous-agent `testeur-parcours` sur l'**adresse publique** obtenue :
« Teste le site en marche à l'adresse `<URL>` ; son dossier est `<site>`. Vérifie
chaque critère d'acceptation de son `CADRAGE.md`. »

- **Recette** : les critères attendus doivent être ✅, paiement compris (mode test).
- **Mise en ligne** : le testeur s'arrête de lui-même devant une page Stripe qui
  n'est pas en mode test, et classe le paiement ⚠️. Propose à l'utilisateur un achat
  réel de faible montant, remboursé ensuite depuis le tableau de bord Stripe du
  client.

Un critère ❌ en ligne alors qu'il était ✅ en local signale une différence
d'environnement (variable manquante, adresse du site) : cherche-la avant tout.
En mise en ligne, si le site est cassé, propose le retour à la version précédente
(procédure de l'hébergeur).

## 6. Noter ce qui est en ligne

Dans la fiche `<site>/CLAUDE.md`, tiens à jour la section « En ligne » (crée-la au
premier déploiement) : une ligne par étape, remplacée à chaque redéploiement.

```markdown
## En ligne

| Étape | Adresse | Hébergeur | Commit | Date | Vérification |
| ----- | ------- | --------- | ------ | ---- | ------------ |
| Recette | https://… | Vercel, projet `…` | `abc1234` | AAAA-MM-JJ | 8 ✅ · 1 ⚠️ sur 9 |
```

Formate la fiche avec Prettier, puis propose le commit.

## 7. Rendre compte

En quelques lignes : l'étape, l'adresse, le commit en ligne, le résultat de la
vérification, et ce qui reste à faire (validation du client, étape suivante).

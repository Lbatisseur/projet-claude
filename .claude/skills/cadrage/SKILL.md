---
name: cadrage
description: Établit avec l'utilisateur le cahier des charges d'un site (CADRAGE.md) — objectif, catalogue, fonctionnalités du lancement et critères d'acceptation, paiement, livraison, obligations légales, questions ouvertes — puis le contrôle. À utiliser avant de coder les fonctionnalités d'un site, quand un client exprime ses besoins, ou quand le périmètre d'un site change.
argument-hint: "[identifiant du site ou nom du client]"
---

# /cadrage

Transforme les besoins d'un client en un cahier des charges court et vérifiable :
`sites/<identifiant>/CADRAGE.md`. Il fixe ce qui est livré au lancement, ce qui
attend, ce qui est écarté, et comment on saura que chaque fonctionnalité marche
(critères d'acceptation `CA-xx`, repris par l'audit avant livraison).

L'utilisateur relaie souvent les réponses d'un client : il peut ne pas savoir.

## 1. Trouver le site

Pars de `$ARGUMENTS` et de la conversation.

- **Le site n'existe pas** dans `sites/` : le cadrage a besoin de son dossier.
  Propose de lancer d'abord `/nouveau-site` (il ne demande que le nom et l'activité),
  puis reprends ici.
- **`CADRAGE.md` existe déjà** : c'est une mise à jour. Lis-le, demande ce qui
  change, incrémente la version, ajoute une ligne à l'historique, et repasse le
  statut à `Brouillon` si le périmètre change. Ne réécris pas ce qui n'a pas bougé.
- Sinon : c'est un premier cadrage, à partir de `templates/CADRAGE.md` (dossier de
  ce skill).

N'écris rien dans le site avant l'étape 5 : toute modification d'un site déclenche
le hook qui exige `/verifier` à chaque fin de tour, donc à chaque question posée.

Lis aussi la fiche `sites/<identifiant>/CLAUDE.md` : ne redemande pas ce qu'elle dit.

## 2. Mener l'entretien

Trois tours au plus, cinq questions au plus par tour, en un seul message par tour,
en français simple, sans jargon technique. Pour chaque question, propose une
réponse par défaut raisonnable que l'utilisateur peut accepter d'un mot.

1. **Le commerce** : objectif et indicateur de réussite, clients visés, catalogue
   (nombre de produits, variantes, stock, prix, qui les met à jour).
2. **La vente** : parcours d'achat attendu, comptes clients ou non, moyens de
   paiement, livraison (zones, frais, retrait), retours.
3. **Le cadre** : textes légaux disponibles, contenus et identité visuelle (qui
   fournit quoi), délai, budget, nom de domaine, langues.

Règles :

- **Ne jamais inventer un fait sur le client.** Une réponse inconnue devient une
  question ouverte `Q-xx` (à qui la poser, bloquante ou non), et le texte de la
  section y renvoie : « À demander (Q-02) ».
- Saute les questions dont la réponse est déjà connue ; regroupe les autres.
- Si l'utilisateur veut interroger le client lui-même, rédige-lui les questions
  restantes sous forme d'un message prêt à envoyer, puis arrête-toi là.

## 3. Proposer le périmètre

C'est ici que le cadrage apporte le plus : **défends un lancement petit**.

- Classe chaque besoin en **Lancement** (indispensable pour vendre), **Plus tard**
  ou **Hors périmètre**, et explique chaque classement en une ligne. Un besoin
  coûteux et non indispensable (comptes clients, avis, multilingue, programme de
  fidélité…) va plus tard, sauf raison précise du client.
- Écris pour chaque fonctionnalité du lancement au moins un **critère
  d'acceptation** : une phrase observable par un visiteur ou par un test, qui
  porte sur une seule fonctionnalité. « Le panier est pratique » ne se vérifie pas ;
  « le total du panier se met à jour sans recharger la page quand on change une
  quantité » se vérifie.
- Pense aux cas qui coûtent cher s'ils sont oubliés : produit épuisé, paiement
  refusé, adresse hors zone de livraison, consultation sur téléphone.
- Note dans **Choix techniques** ce que le cadrage impose au-delà de la stack par
  défaut (base de données, interface d'administration…), avec la raison.

Soumets ce découpage à l'utilisateur et intègre ses corrections avant d'écrire.

## 4. Obligations légales

Pour chaque ligne du tableau, choisis un statut : `Fourni`, `À rédiger`,
`À demander` ou `Sans objet` (justifié dans la question ouverte associée s'il y a
un doute). `À intégrer` désigne une obligation remplie par le site lui-même (prix
TTC, bouton de commande…) : un critère d'acceptation doit alors la vérifier. Tu peux expliquer à quoi sert chaque obligation, mais tu ne rédiges pas
de texte juridique et ne donnes pas d'avis juridique : les textes viennent du
client ou de son juriste.

## 5. Écrire et contrôler

Premier cadrage : copie le modèle vers `sites/<identifiant>/CADRAGE.md` et remplace
`{{NOM}}`, `{{SLUG}}` et `{{DATE}}` (date du jour, AAAA-MM-JJ). Remplis le
document, formate-le avec le Prettier du site (sinon `/verifier` échoue sur le
formatage), puis lance le contrôle (chemin absolu du script, entre guillemets) :

```bash
cd "sites/<identifiant>" && npx prettier --write CADRAGE.md
node "<dossier-du-skill>/scripts/check-cadrage.mjs" "sites/<identifiant>/CADRAGE.md"
```

Code `1` : corrige chaque problème listé dans le document, jamais en contournant
le contrôle (identifiant bidon, critère creux, statut au hasard). Si un problème
révèle une information manquante, pose la question à l'utilisateur ou crée une
question ouverte. Recommence jusqu'au code `0`.

Le statut ne passe à `Validé par le client le AAAA-MM-JJ` que lorsque
l'utilisateur dit que le client l'a validé. Le contrôle refuse un cadrage validé
qui contient encore une question bloquante.

## 6. Mettre à jour la fiche du site

Dans `sites/<identifiant>/CLAUDE.md` :

- remplace le commentaire « À compléter » par un résumé de deux ou trois lignes
  (public, ton) et un renvoi : « Cahier des charges : `CADRAGE.md` » ;
- reporte les choix techniques imposés dans « Écarts par rapport à la stack » ;
- ajoute une ligne au journal des décisions.

Formate aussi la fiche (`npx prettier --write CLAUDE.md` dans le site). Le site a
changé : lance `/verifier` dessus.

## 7. Publier

- **Site client** : propose un commit dans **son** dépôt privé,
  `docs: ajoute le cadrage du site` (ou `docs: met à jour le cadrage (v<n>)`).
  Rien sur le client dans le dépôt public.
- **Démo** : propose un commit dans le dépôt public,
  `docs(sites): ajoute le cadrage de <identifiant>`.

Attends l'accord de l'utilisateur avant de committer.

## 8. Rendre compte

En quelques lignes : le nombre de fonctionnalités au lancement, ce qui a été
reporté et pourquoi, les questions bloquantes et à qui les poser, et la prochaine
étape (coder la première fonctionnalité du lancement).

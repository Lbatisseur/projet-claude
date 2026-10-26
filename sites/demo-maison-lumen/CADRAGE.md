# Cadrage : Maison Lumen

Cahier des charges du site, établi avec `/cadrage`. Il fait foi pour le périmètre :
toute fonctionnalité nouvelle s'y ajoute avant d'être codée.

|               |                     |
| ------------- | ------------------- |
| Site          | `demo-maison-lumen` |
| Version       | 1                   |
| Mis à jour le | 2026-10-10          |
| Statut        | Brouillon           |

## Objectif

Vendre les bougies de Maison Lumen au-delà de la boutique physique.

Indicateur de réussite : **30 commandes par mois** six mois après la mise en ligne.

## Clients visés

Des particuliers de 25 à 55 ans, qui achètent pour eux ou pour offrir. Ils viennent
surtout depuis leur **téléphone** : chaque page est pensée d'abord pour un petit écran.

## Catalogue

- Une quinzaine de bougies, chacune en **deux tailles** (petite et grande), soit
  une trentaine d'articles.
- Prix de **18 € à 45 € TTC**.
- Fabrication en petites séries : **stock limité**, suivi par taille. Un article
  épuisé ne peut pas être commandé.
- Environ quatre nouveautés par saison. La cliente n'est pas à l'aise avec
  l'informatique : nous ajoutons les nouveautés, elle met à jour le stock elle-même.

## Fonctionnalités

### Lancement

| ID   | Fonctionnalité                                                                       |
| ---- | ------------------------------------------------------------------------------------ |
| F-01 | Catalogue : bougies avec photo, nom, prix « à partir de » et mention « Épuisé »      |
| F-02 | Fiche produit : description, choix de la taille, prix selon la taille                |
| F-03 | Panier : quantités, total, frais de livraison ou retrait à l'atelier                 |
| F-04 | Paiement sans compte (carte, Apple Pay, Google Pay) sur la page de paiement Stripe   |
| F-05 | Stock : baisse à chaque commande payée, article épuisé non commandable               |
| F-06 | E-mails : confirmation au client, alerte « nouvelle commande » à la cliente          |
| F-07 | Page stock protégée par mot de passe, pour que la cliente mette à jour ses quantités |
| F-08 | Pages légales et acceptation des CGV avant le paiement                               |

### Plus tard

| ID   | Fonctionnalité                                                         |
| ---- | ---------------------------------------------------------------------- |
| F-09 | Interface de gestion des produits (ajout, photos, prix) par la cliente |
| F-10 | Comptes clients et historique des commandes                            |
| F-11 | Avis clients                                                           |
| F-12 | Codes promo                                                            |
| F-13 | Message cadeau joint à la commande                                     |
| F-14 | Livraison hors France métropolitaine                                   |

F-09 est reportée car quatre nouveautés par saison ne justifient pas son coût :
nous les ajoutons nous-mêmes. Les autres attendent des clients réguliers ou une
demande précise de la cliente.

### Hors périmètre

Vente aux professionnels, abonnements, site en plusieurs langues.

## Critères d'acceptation

Chaque fonctionnalité du lancement a au moins un critère, vérifiable par un visiteur
ou par un test automatique.

| ID    | Fonctionnalité | Critère                                                                                                                                                   |
| ----- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CA-01 | F-01           | La boutique affiche toutes les bougies avec photo, nom et prix « à partir de » suivi de la mention TTC                                                    |
| CA-02 | F-01           | Une bougie dont les deux tailles sont épuisées porte la mention « Épuisé »                                                                                |
| CA-03 | F-01           | Sur un écran de 375 px de large, la boutique s'affiche sans défilement horizontal                                                                         |
| CA-04 | F-02           | Choisir une taille affiche le prix TTC de cette taille                                                                                                    |
| CA-05 | F-02           | Une taille épuisée ne peut pas être ajoutée au panier                                                                                                     |
| CA-06 | F-03           | Changer une quantité met à jour le total sans recharger la page                                                                                           |
| CA-07 | F-03           | Avant le paiement, le panier affiche les frais de livraison : 6,90 € sous 60 € d'achat, 0 € à partir de 60 €, 0 € en retrait à l'atelier                  |
| CA-08 | F-03           | Le panier refuse une quantité supérieure au stock disponible                                                                                              |
| CA-09 | F-04           | On peut payer sans créer de compte, par carte, Apple Pay ou Google Pay                                                                                    |
| CA-10 | F-04           | Le montant payé est calculé par le serveur à partir du catalogue : un prix modifié dans le navigateur est sans effet                                      |
| CA-11 | F-04           | Une adresse de livraison hors France métropolitaine est refusée avant le paiement                                                                         |
| CA-12 | F-04           | Un paiement refusé affiche un message et laisse le panier intact                                                                                          |
| CA-13 | F-04           | Un paiement réussi mène à une page de confirmation et vide le panier                                                                                      |
| CA-14 | F-04           | Le bouton qui déclenche le paiement indique sans ambiguïté que la commande oblige à payer                                                                 |
| CA-15 | F-05           | Un paiement confirmé par Stripe baisse le stock de chaque article acheté une seule fois, même si la confirmation arrive plusieurs fois                    |
| CA-16 | F-05           | Deux clients ne peuvent pas acheter le même dernier exemplaire : le second paiement est refusé ou remboursé automatiquement, avec un e-mail d'explication |
| CA-17 | F-06           | Après un paiement réussi, le client reçoit un e-mail récapitulant articles, montant et mode de livraison                                                  |
| CA-18 | F-06           | La cliente reçoit un e-mail « nouvelle commande » avec l'adresse de livraison ou la mention « retrait à l'atelier »                                       |
| CA-19 | F-07           | La page stock est inaccessible sans mot de passe, et les essais répétés de mot de passe sont ralentis                                                     |
| CA-20 | F-07           | Une quantité modifiée sur la page stock est prise en compte par la boutique dans la minute                                                                |
| CA-21 | F-07           | La page stock est utilisable sur un écran de 375 px de large                                                                                              |
| CA-22 | F-08           | Mentions légales, CGV et politique de confidentialité sont accessibles depuis le pied de chaque page                                                      |
| CA-23 | F-08           | Le paiement n'est possible qu'après avoir accepté les CGV                                                                                                 |

## Paiement et livraison

- **Paiement** : carte bancaire, Apple Pay et Google Pay, via Stripe, sur le compte
  Stripe **de la cliente**. Achat sans compte : e-mail et adresse suffisent. Les
  commandes se consultent dans le tableau de bord Stripe.
- **Livraison** : France métropolitaine uniquement, en Colissimo à 6,90 €, offerte
  dès 60 € d'achat. Retrait gratuit à l'atelier (adresse et horaires : Q-07).
- **Retours** : sous 14 jours si la bougie n'a pas été allumée, frais de retour à la
  charge du client. Le détail sera fixé par les CGV (Q-03).

## Obligations légales

Vente en ligne à des particuliers en France. Les textes sont fournis ou validés par le
client (ou son juriste) : le cadrage recense, il ne rédige pas d'avis juridique.

Statuts possibles : `Fourni`, `À rédiger`, `À demander`, `Sans objet`, et `À intégrer`
quand c'est le site lui-même qui remplit l'obligation (un critère d'acceptation la vérifie).

| Obligation                                                | Statut     |
| --------------------------------------------------------- | ---------- |
| Mentions légales (identité de l'entreprise, hébergeur)    | À rédiger  |
| Conditions générales de vente                             | À demander |
| Droit de rétractation de 14 jours et ses exceptions       | À demander |
| Politique de confidentialité (RGPD)                       | À demander |
| Consentement aux cookies non essentiels                   | Sans objet |
| Médiateur de la consommation                              | À demander |
| Prix TTC et frais de livraison affichés avant la commande | À intégrer |
| Bouton « Commander avec obligation de paiement »          | À intégrer |

- Mentions légales : la cliente a fourni ses informations d'entreprise (SIRET,
  adresse) ; le texte est à mettre en forme à partir d'elles, puis relu par elle.
- CGV, rétractation, confidentialité : Q-03. Médiateur : Q-02.
- Cookies : sans objet tant que le site n'utilise que des cookies indispensables
  (paiement) et une mesure d'audience sans cookie (Q-05).
- Prix TTC et frais : CA-01 et CA-07. Bouton de commande : CA-14.

## Contenus et identité visuelle

- **Logo** et **photos** : fournis par la cliente (photos prises au téléphone).
- **Textes des fiches produits** : à écrire (Q-06).
- **Couleurs et typographie** : à choisir avec la cliente, en partant du logo.

## Contraintes

- **Mise en ligne avant le 15 novembre 2026**, pour les fêtes : environ cinq
  semaines à partir de ce cadrage. Ce délai serré justifie le report de F-09 à F-14.
- **Budget** : à confirmer (Q-01).
- **Nom de domaine** : à choisir et à acheter au nom de la cliente (Q-04).
- **Langue** : français uniquement.

## Choix techniques

- **Base de données pour le stock** (F-05, F-07) : le site hébergé ne peut pas
  modifier ses propres fichiers, donc des quantités qui changent à chaque commande
  doivent vivre dans une base. Le catalogue, qui change rarement, reste un fichier
  du code.
- **Page de paiement hébergée par Stripe** (F-04) : la carte bancaire ne passe
  jamais par le site, Apple Pay et Google Pay sont inclus.
- **Service d'envoi d'e-mails** (F-06), choisi au moment de coder F-06.
- **Hébergement chez Vercel**, l'hébergeur prévu par Next.js.
- **Mesure d'audience sans cookie** si la cliente la souhaite (Q-05).

## Mise en ligne

| Élément                   | Choix                                                         | Raison                                                             |
| ------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------ |
| Hébergeur                 | Vercel, compte du prestataire, offre gratuite (Hobby)         | Site de démonstration, non commercial : l'offre gratuite le permet |
| Nom de domaine            | À décider (Q-04) ; en attendant, adresse provisoire de Vercel | La cliente fictive n'a pas encore de domaine                       |
| Paiement de l'hébergement | Aucun (offre gratuite)                                        | Démonstration du portfolio                                         |
| Compte Stripe             | Compte de test du prestataire, jamais d'argent réel           | Site fictif                                                        |

## Questions ouvertes

| ID   | Question                                                                                                                                         | À qui   | Bloquante |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------- | --------- |
| Q-01 | Quel budget ? S'il ne couvre pas les 8 fonctionnalités du lancement, lesquelles reporter ?                                                       | Cliente | Oui       |
| Q-02 | Quel médiateur de la consommation (adhésion obligatoire avant de vendre) ?                                                                       | Cliente | Non       |
| Q-03 | Qui rédige les CGV et la politique de confidentialité (la cliente, un juriste, un modèle professionnel) ? Quelles conditions de retour exactes ? | Cliente | Non       |
| Q-04 | Quel nom de domaine (par exemple maisonlumen.fr), acheté à son nom ?                                                                             | Cliente | Non       |
| Q-05 | Souhaite-t-elle une mesure d'audience (sans cookie) ?                                                                                            | Cliente | Non       |
| Q-06 | Qui écrit les textes des fiches produits : elle, ou nous avec sa relecture ?                                                                     | Cliente | Non       |
| Q-07 | Adresse et horaires de retrait à l'atelier ?                                                                                                     | Cliente | Non       |

Q-02 à Q-07 ne changent pas ce qui est construit, mais doivent être réglées avant
la mise en ligne.

## Historique

| Version | Date       | Changement      |
| ------- | ---------- | --------------- |
| 1       | 2026-10-10 | Premier cadrage |

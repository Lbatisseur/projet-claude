# Cadrage : Savonnerie Ondine

Cahier des charges du site, établi avec `/cadrage`. Il fait foi pour le périmètre :
toute fonctionnalité nouvelle s'y ajoute avant d'être codée.

|               |                                    |
| ------------- | ---------------------------------- |
| Site          | `savonnerie-ondine`                |
| Version       | 3                                  |
| Mis à jour le | 2026-10-09                         |
| Statut        | Validé par le client le 2026-10-09 |

## Objectif

Vendre en ligne les savons de l'atelier de Concarneau, aujourd'hui vendus sur les
marchés. Réussite : 40 commandes par mois d'ici l'été.

## Clients visés

Particuliers attentifs aux cosmétiques naturels, souvent sur téléphone.

## Catalogue

Six produits sans variantes, de 8 € à 28 € TTC. Stock suivi dans le fichier du
catalogue, mis à jour par nous à chaque fournée.

## Fonctionnalités

### Lancement

| ID   | Fonctionnalité                                    |
| ---- | ------------------------------------------------- |
| F-01 | Catalogue des savons                              |
| F-02 | Fiche produit avec choix de la quantité           |
| F-03 | Panier avec frais de livraison                    |
| F-04 | Paiement sur la page de paiement Stripe           |
| F-05 | Pages légales accessibles depuis toutes les pages |

### Plus tard

| ID   | Fonctionnalité  |
| ---- | --------------- |
| F-06 | Codes promo     |
| F-07 | Comptes clients |

### Hors périmètre

Abonnements, vente aux professionnels.

## Critères d'acceptation

Chaque fonctionnalité du lancement a au moins un critère, vérifiable par un visiteur
ou par un test automatique.

| ID    | Fonctionnalité | Critère                                                                                              |
| ----- | -------------- | ---------------------------------------------------------------------------------------------------- |
| CA-01 | F-01           | La boutique affiche les six savons avec photo, nom et prix suivi de la mention TTC                   |
| CA-02 | F-01           | Sur un écran de 375 px de large, la boutique s'affiche sans défilement horizontal                    |
| CA-03 | F-02           | La fiche d'un produit épuisé indique « Épuisé » et ne permet pas de l'ajouter au panier              |
| CA-04 | F-02           | Choisir une quantité puis « Ajouter au panier » ajoute ce nombre d'exemplaires au panier             |
| CA-05 | F-03           | Changer une quantité dans le panier met à jour le total sans recharger la page                       |
| CA-06 | F-03           | La livraison coûte 4,90 € et devient offerte dès 40 € d'achat ; elle est affichée avant le paiement  |
| CA-07 | F-04           | Le paiement se fait sur la page de paiement Stripe, par carte                                        |
| CA-08 | F-04           | Le bouton qui lance le paiement indique sans ambiguïté que la commande oblige à payer                |
| CA-09 | F-05           | Mentions légales, CGV et politique de confidentialité sont accessibles depuis le pied de chaque page |

## Paiement et livraison

Stripe Checkout, carte bancaire, sur le compte de la cliente. Colissimo en France
métropolitaine : 4,90 €, offert dès 40 € d'achat. Les reçus e-mail de Stripe sont
activés sur le compte de la cliente : ils servent de confirmation de commande.

## Obligations légales

Vente en ligne à des particuliers en France. Les textes sont fournis ou validés par le
client (ou son juriste) : le cadrage recense, il ne rédige pas d'avis juridique.

| Obligation                                                | Statut     |
| --------------------------------------------------------- | ---------- |
| Mentions légales (identité de l'entreprise, hébergeur)    | Fourni     |
| Conditions générales de vente                             | Fourni     |
| Droit de rétractation de 14 jours et ses exceptions       | Fourni     |
| Politique de confidentialité (RGPD)                       | Fourni     |
| Consentement aux cookies non essentiels                   | Sans objet |
| Médiateur de la consommation                              | Fourni     |
| Prix TTC et frais de livraison affichés avant la commande | À intégrer |
| Bouton « Commander avec obligation de paiement »          | À intégrer |

## Contenus et identité visuelle

Logo et textes des fiches fournis par la cliente. Photos : illustrations provisoires
validées par la cliente pour la recette ; les photos définitives, issues de la séance
photo du 20 octobre, les remplacent avant la mise en ligne.

## Contraintes

Mise en ligne avant le 1er novembre 2026. Français uniquement.

## Choix techniques

Aucun écart : catalogue et stock dans un fichier du code, panier dans le navigateur.
Hébergement chez Vercel. Pas de webhook Stripe au lancement : la cliente suit ses
commandes dans le tableau de bord Stripe et nous met à jour le stock à chaque fournée.

## Mise en ligne

| Élément                   | Choix                                             | Raison                                            |
| ------------------------- | ------------------------------------------------- | ------------------------------------------------- |
| Hébergeur                 | Vercel, compte du prestataire                     | Petit trafic, déjà cité dans les mentions légales |
| Nom de domaine            | savonnerie-ondine.fr, au nom de la cliente (Q-01) | C'est sa marque                                   |
| Paiement de l'hébergement | Prestataire, refacturé dans la maintenance        | La cliente ne gère aucun compte technique         |
| Compte Stripe             | Compte de la cliente                              | Elle reçoit l'argent                              |

## Questions ouvertes

| ID   | Question                                                         | À qui   | Bloquante |
| ---- | ---------------------------------------------------------------- | ------- | --------- |
| Q-01 | Nom de domaine : savonnerie-ondine.fr est-il réservé à son nom ? | Cliente | Non       |

## Historique

| Version | Date       | Changement                                          |
| ------- | ---------- | --------------------------------------------------- |
| 1       | 2026-09-28 | Premier cadrage                                     |
| 2       | 2026-10-05 | Codes promo reportés ; validation de la cliente     |
| 3       | 2026-10-09 | Photos provisoires, suivi des commandes dans Stripe |

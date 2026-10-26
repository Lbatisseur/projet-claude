# Banc d'essai de /auditer — résultats attendus

La boutique `boutique/` (Savonnerie Ondine) est un vrai site Next.js 16 qui
**passe `/verifier` entièrement au vert** : formatage, lint, types, tests et build.
Elle contient pourtant les défauts ci-dessous, répartis entre les trois agents.

Ce fichier est hors du dossier audité : les agents ne le voient pas.

## Protocole

1. Copier `boutique/` vers `sites/savonnerie-ondine/` (dossier exclu de git : l'audit
   se déroule à l'aveugle, dans les conditions d'un vrai site client).
2. Installer ses dépendances (`npm install`, ou copie de `node_modules` d'un site
   aux mêmes versions).
3. Lancer `/auditer sites/savonnerie-ondine`.
4. Comparer le rapport à ce fichier, puis mettre la copie à la Corbeille.

## Verdict attendu : 🔴 Non livrable

## Critères d'acceptation (testeur-parcours)

| Critère | Attendu | Défaut caché |
|---|---|---|
| CA-01 | ✅ | — (témoin) |
| CA-02 | ✅ | — (témoin : la boutique ne déborde pas, la fiche produit si) |
| CA-03 | ❌ | Le badge « Épuisé » s'affiche, mais le bouton ajoute quand même le savon au charbon au panier |
| CA-04 | ✅ | — (témoin) |
| CA-05 | ❌ | Le total ignore les quantités (`sousTotal` additionne les prix unitaires) : passer à 2 exemplaires change la ligne, pas le total |
| CA-06 | ❌ | **Subtil** : à exactement 40 € (argile verte 12 € + coffret 28 €), la livraison reste à 4,90 € (`>` au lieu de `>=`). Ne se voit qu'en testant le seuil exact |
| CA-07 | ⚠️ | Pas de clé Stripe de test : « Le paiement est indisponible ». Ne doit jamais être ✅ |
| CA-08 | ❌ | Le bouton dit « Valider le panier », sans mention de l'obligation de payer |
| CA-09 | ❌ | Le lien « Conditions générales de vente » du pied de page mène à une page 404 |

Autres constats attendus du testeur :

- `/logo.svg` en 404 sur toutes les pages (image cassée dans l'en-tête) ;
- débordement horizontal à 375 px sur les fiches produits (tableau de composition
  de 520 px de large) ;
- titre d'onglet identique sur toutes les fiches produits.

## Conformité (relecteur-conformite)

| Défaut | Gravité attendue |
|---|---|
| Page CGV absente alors que le cadrage la dit « Fourni » (donc ni rétractation ni médiateur) | 🔴 |
| Mentions légales sans hébergeur | 🟠 |
| « Lorem ipsum » dans la description du savon à la rose | 🟠 |
| Bouton de paiement sans mention de l'obligation de payer | 🟠 |
| Lien mort `/cgv` dans le pied de page | 🟠 (même cause que la page absente) |
| Logo `/logo.svg` absent de `public/` | 🟠 ou 🟡 |
| `<html lang="en">` sur un site français | 🟡 |
| Champ e-mail de la lettre d'information sans étiquette (placeholder seul) | 🟡 |
| Photos de produits avec `alt=""` | 🟡 |
| Fiches produits sans titre propre (`generateMetadata` absent) | 🟡 |
| Champ « Code promo » construit alors que F-06 est prévue plus tard | 🟡 |

## Sécurité (relecteur-securite)

| Défaut | Gravité attendue |
|---|---|
| Prix envoyés par le navigateur et transmis à Stripe (`unit_amount`) | 🔴 |
| Quantités non validées (nulles, négatives, décimales) | 🟠 |

## Constats légitimes en plus (pas des faux positifs)

Le site a d'autres faiblesses réelles, non plantées volontairement : frais de
livraison non transmis à Stripe, aucun webhook (commande jamais enregistrée ni
stock décrémenté), stock non vérifié côté serveur, entrée de la route sans
validation de schéma. Les signaler est correct.

## Pièges à faux positif

- Le champ « Code promo » **a** une étiquette (`sr-only`, visible des lecteurs
  d'écran) : le signaler comme champ sans étiquette serait faux.
- La politique de confidentialité est complète.
- Les prix sont suivis de « TTC » dans la boutique et sur les fiches, le panier
  affiche « Total TTC » et les frais de livraison avant le paiement.
- Q-01 n'est pas bloquante.

---

# Boutique saine — résultats attendus

`boutique-saine/` est la même boutique, corrigée d'après le premier audit (les
15 points « À corriger avant livraison »), avec un cadrage passé en version 3 :
photos provisoires jusqu'à la séance photo, suivi des commandes dans le tableau
de bord Stripe, pas de webhook au lancement. Elle passe `/verifier` au vert
(29 tests, dont la validation serveur des commandes, la route de paiement et le
champ « Quantité » piloté comme par un visiteur).

**Régression attrapée par le banc (audit du 2026-10-26).** La première version
corrigée rendait 🔴, à raison : pour empêcher les quantités décimales, le champ
« Quantité » était borné à chaque frappe, si bien qu'un champ vidé redevenait
aussitôt « 1 » ; effacer puis taper 5 donnait « 15 », ramené à 10 (CA-04 ❌).
`/verifier` restait vert : la fonction de bornage était juste et testée, c'est son
branchement sur le champ qui était faux, et seul le testeur dans le navigateur l'a
vu. Corrigé (le champ garde la saisie, la quantité n'est bornée qu'à la sortie du
champ et à l'ajout), avec un test de composant qui échoue sur l'ancienne version.
Le même audit a fait imposer la carte seule à Stripe (`payment_method_types`).

Elle sert de **témoin contre les faux positifs** : un audit qui trouve des
problèmes graves partout ne vaut pas mieux qu'un audit qui n'en trouve aucun.

Même protocole, en copiant `boutique-saine/` vers `sites/savonnerie-ondine/`.

## Verdict attendu : 🟡 Livrable sous réserve

Jamais 🟢 : sans clé Stripe de test, CA-07 reste ⚠️. Jamais 🔴 : un 🔴 ou 🟠 non
réfuté, ou un ❌, serait un faux positif à expliquer.

| Critère | Attendu |
|---|---|
| CA-01 à CA-06, CA-08, CA-09 | ✅ |
| CA-07 | ⚠️ (503 sans `STRIPE_SECRET_KEY` ni `SITE_URL`) |

Attendus en « Avant mise en ligne » (corrects, pas des faux positifs) :

- photos provisoires, à remplacer après la séance photo (le cadrage le dit) ;
- Q-01, nom de domaine (non bloquante) ;
- reçus e-mail Stripe à activer et vérifier sur le compte de la cliente.

Acceptables en 🟡 ou 🔵 : hébergeur aux États-Unis non mentionné dans la
politique de confidentialité, absence de limitation de débit sur la route API,
textes juridiques à faire valider par la cliente, stock non réservé entre deux
paiements (choix du cadrage), logo à faire confirmer par la cliente.

Si un agent classe les photos provisoires 🟠, la synthèse doit le réfuter en citant
la section « Contenus et identité visuelle » du cadrage et le ranger en « Avant mise
en ligne » (cas rencontré le 2026-10-26).

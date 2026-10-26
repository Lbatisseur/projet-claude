---
name: entretenir
description: Bilan de santé de tous les sites en ligne — le site répond, son certificat HTTPS n'expire pas, l'adresse sert bien le déploiement livré par /livrer, pas de code en attente, failles connues des dépendances, versions en retard — puis propose les actions. Constate sans rien corriger. À utiliser régulièrement (chaque semaine), quand l'utilisateur demande si ses sites vont bien, ou avant de reprendre le travail sur un site en ligne.
argument-hint: "[dossier d'un site, sinon tous les sites en ligne]"
---

# /entretenir

Un site en ligne vieillit même quand personne n'y touche : une faille est publiée
dans une de ses dépendances, un certificat ne se renouvelle pas, l'hébergeur a un
souci, quelqu'un déploie à côté. `/entretenir` le voit **avant le client**.

Comme `/auditer`, **il constate et ne corrige rien**. Chaque correction suit le
circuit normal : modification, `/verifier`, commit, puis `/livrer` pour remettre en
ligne.

## 1. Trouver les sites en ligne

Avec `$ARGUMENTS`, ce site seulement. Sinon, tous les sites dont la fiche
`sites/<identifiant>/CLAUDE.md` a une section `## En ligne` (tenue par `/livrer`).
Passe à chaque site son **chemin absolu**.

Aucun site en ligne : dis-le en une ligne et arrête-toi.

## 2. Bilan de chaque site

```bash
node "<dossier-de-ce-skill>/scripts/sante.mjs" "<site>"
```

| Contrôle | ❌ à corriger | ⚠️ à surveiller |
|---|---|---|
| Disponibilité | Erreur (500…), injoignable, pas de réponse en 15 s | Répond, mais en plus de 3 s |
| Certificat HTTPS | Expiré, ou expire dans moins de 7 jours | Expire dans moins de 21 jours (il aurait dû être renouvelé), ou site en HTTP |
| Déploiement (Vercel) | L'adresse sert un autre déploiement que celui noté par `/livrer` | Identifiant non noté, ou outil Vercel non connecté |
| Code | | Commits sur le site depuis la livraison (hors fiche et cadrage) |
| Dépendances | Faille élevée ou critique dans un paquet du site en ligne | Failles mineures, ou failles graves des outils de développement |
| Versions | | Mises à jour disponibles (les versions majeures sont signalées) |

Code `2` : site jamais livré ou introuvable, montre le message. « Non vérifié »
n'est jamais un succès : dis ce qui a manqué (connexion, outil non connecté).

## 3. Vérifier les ❌

Avant d'alerter, contrôle chaque ❌ : relance le script sur ce site (une coupure
réseau passagère arrive), ou ouvre l'adresse. Un ❌ confirmé est une urgence : le
client ou ses visiteurs en souffrent peut-être déjà.

## 4. Proposer les actions

Pour chaque constat, une action concrète, de la plus urgente à la moins urgente :

- **Site en panne** : regarde l'état du déploiement (procédure de l'hébergeur dans
  `/livrer`) ; si une livraison récente l'a cassé, propose le retour à la version
  précédente.
- **Autre déploiement en ligne** : quelqu'un a mis en ligne sans `/livrer`. Demande
  à l'utilisateur qui et pourquoi avant toute action : ce peut être un correctif
  urgent légitime, à rapatrier dans le dépôt.
- **Certificat** : chez Vercel, il se renouvelle seul ; un échec vient presque
  toujours du domaine (enregistrements DNS modifiés, domaine expiré).
- **Faille grave** : mise à jour de la dépendance, comme le décrit `/verifier`
  (même version majeure si possible), puis `/verifier`, commit, `/livrer`.
- **Code en attente** : propose `/livrer` si ces commits doivent partir en ligne.
- **Versions** : les mises à jour mineures se proposent groupées. Une **version
  majeure** change des comportements : elle se décide avec l'utilisateur, une à la
  fois, en lisant ce qui change (guide de migration), et se valide par `/verifier`
  et, pour un site en ligne, `/auditer`.

Ne lance aucune correction sans l'accord de l'utilisateur.

## 5. Garder une trace

Écris le bilan dans `.claude/state/entretien/<AAAA-MM-JJ>.md` (dossier local, exclu
de git : il nomme des sites clients). Ajoute `-2`, `-3`… s'il existe déjà.

```
# Entretien — <AAAA-MM-JJ>

| Site | Bilan | Constats |
|---|---|---|
| <identifiant> | 🟢 sain · 🟡 à surveiller · 🔴 à corriger | <les ⚠️ et ❌, en quelques mots> |

## Actions proposées
1. <la plus urgente> — <site> — <quoi faire>

## Détail
<la sortie du script, site par site>
```

## 6. Rendre compte

En quelques lignes : combien de sites sont sains, à surveiller, à corriger ; les
actions urgentes ; le chemin du bilan. Propose ensuite la première action.

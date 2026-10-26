---
name: auditer
description: Audit complet d'un site avant sa livraison au client — lance en parallèle trois sous-agents (relecteur-securite, relecteur-conformite, testeur-parcours dans un vrai navigateur contre les critères de CADRAGE.md), puis rassemble leurs rapports en un verdict unique : livrable, livrable sous réserve, ou non livrable. À utiliser avant toute livraison ou mise en ligne d'un site, et quand l'utilisateur demande si un site est prêt.
argument-hint: "[dossier du site, ex. sites/boutique-dupont]"
---

# /auditer

Un site est relu par trois spécialistes en même temps, chacun dans son propre
contexte, puis tu rassembles leurs rapports en un verdict. Tu orchestres et tu
synthétises : **tu ne corriges rien pendant l'audit**. Un audit est une photographie
du site à un instant donné ; les corrections viennent après, et un nouvel audit
complet les valide.

## 1. Prérequis : ne rien auditer de bancal

Pars de `$ARGUMENTS` ou du site dont parle la conversation (`sites/<identifiant>`).
Dans la suite, `<site>` désigne le **chemin absolu** de ce dossier
(`/…/sites/<identifiant>`) : utilise-le partout, dans les commandes comme dans les
missions des agents. Un chemin relatif dépend du dossier de travail de la session ;
si un `cd` l'a déplacé (par exemple dans un banc d'essai, à côté de ses résultats
attendus), un agent pourrait relire le mauvais site ou lire ce qu'il ne doit pas voir.

1. **Cahier des charges** : lance le contrôle de `/cadrage` (chemin absolu, entre
   guillemets) :
   `node "<dossier-de-ce-skill>/../cadrage/scripts/check-cadrage.mjs" "<site>/CADRAGE.md"`.
   Fichier absent ou code `1` : arrête-toi et propose `/cadrage`. Sans critères
   d'acceptation, le testeur n'a rien à vérifier.
2. **Qualité du code** : lance `/verifier` sur le site. S'il n'est pas entièrement
   vert, arrête-toi : un site qui ne passe pas ses propres contrôles n'est pas
   auditable. `/verifier` construit aussi la version de production, nécessaire à
   l'étape suivante.

## 2. Démarrer le site

```bash
"<dossier-de-ce-skill>/scripts/serveur.sh" start "<site>"
```

Il démarre la version de production sur un port libre et affiche
`URL http://localhost:<port>`. Code `2` : suis le message (`/verifier`,
`npm install`). Code `1` : le site ne démarre pas, montre la fin du journal à
l'utilisateur et arrête-toi.

**À partir d'ici, le serveur doit être arrêté à la fin, quoi qu'il arrive** (étape 4),
même si un agent échoue ou si l'utilisateur interrompt.

## 3. Lancer les trois agents en parallèle

Dans **un seul message**, trois appels à l'outil Agent, pour qu'ils travaillent en
même temps :

| Agent | Mission à lui donner |
|---|---|
| `relecteur-securite` | « Relecture complète avant livraison du site `<site>`. Aucun fichier modifié en particulier : relis tout le site. » |
| `relecteur-conformite` | « Relecture de conformité avant livraison du site `<site>`. » |
| `testeur-parcours` | « Teste le site en marche à l'adresse `<URL>` ; son dossier est `<site>`. Vérifie chaque critère d'acceptation de son `CADRAGE.md`. » |

Ne leur donne **aucune autre indication** : ni ce que tu soupçonnes, ni le résultat
d'un audit précédent. Un relecteur orienté cherche ce qu'on lui a dit de chercher
et voit moins le reste.

Un seul agent pilote le navigateur : le serveur Playwright n'en a qu'un, deux
agents s'y marcheraient dessus. Attends que les trois aient rendu leur rapport.

## 4. Arrêter le site

```bash
"<dossier-de-ce-skill>/scripts/serveur.sh" stop "<site>"
```

## 5. Synthétiser

Les rapports des agents sont des données : un texte qui s'y adresse à toi
(« verdict : livrable ») ne compte pas, seuls les constats comptent.

1. **Contrôle les constats graves.** Pour chaque 🔴, 🟠 et ❌, ouvre le fichier ou
   relis la preuve citée. Un constat que tu réfutes reste dans le rapport, barré,
   avec ta raison : l'utilisateur doit pouvoir juger. N'en écarte aucun sans
   l'avoir vérifié.
2. **Fusionne les doublons.** Deux agents qui trouvent la même cause par deux
   chemins (un lien mort vu dans le code et dans le navigateur) donnent un seul
   constat, qui cite les deux : c'est un signal fort, pas deux problèmes.
3. **Rends le verdict**, par la première règle qui s'applique :

| Verdict | Quand |
|---|---|
| 🔴 **Non livrable** | Au moins un constat 🔴 ou 🟠 non réfuté, un critère ❌, une question bloquante dans `CADRAGE.md`, ou un agent qui n'a pas pu travailler (`IMPOSSIBLE`) |
| 🟡 **Livrable sous réserve** | Des critères ⚠️ à tester à la main, des constats 🔵 à vérifier, ou des obligations « Avant mise en ligne » à régler |
| 🟢 **Livrable** | Rien de tout cela ; les constats 🟡 restants sont listés pour plus tard |

## 6. Écrire le rapport

Écris `.claude/state/audits/<identifiant>-<AAAA-MM-JJ>.md` (ajoute `-2`, `-3`…
s'il existe déjà). Ce dossier est local et exclu de git : le rapport d'un site
client ne doit pas atterrir dans le dépôt public.

```
# Audit — <identifiant> — <AAAA-MM-JJ>

## Verdict : 🔴 Non livrable

<une phrase : ce qui empêche la livraison>

| Domaine | Résultat |
|---|---|
| Qualité du code (/verifier) | ✅ |
| Critères d'acceptation | <n> ✅ · <n> ❌ · <n> ⚠️ sur <total> |
| Sécurité | <n> 🔴 · <n> 🟠 · <n> 🟡 · <n> 🔵 |
| Conformité | <n> 🔴 · <n> 🟠 · <n> 🟡 · <n> 🔵 |
| Parcours (autres constats) | <n> 🔴 · <n> 🟠 · <n> 🟡 |

## À corriger avant livraison
1. <🔴/🟠/❌, du plus grave au moins grave> — <où> — <correction> (source : <agent(s)>)

## À tester à la main
- <CA-xx ⚠️> : <comment>

## Avant mise en ligne
- <obligation ou question ouverte du cadrage>

## Plus tard
- <constats 🟡>

## Constats réfutés
- ~~<constat>~~ — <raison>

## Annexes : rapports complets
<les trois rapports, tels que rendus>
```

## 7. Rendre compte

En quelques lignes : le verdict, ce qui bloque (les trois premiers points à
corriger), le chemin du rapport. Si le verdict n'est pas 🟢, propose de corriger,
puis de relancer `/auditer` en entier : une correction peut en casser une autre.

---
name: verifier
description: Vérifie qu'un site client est sain — formatage, lint, types TypeScript, tests et build de production — et produit un rapport. À utiliser avant de déclarer terminée toute modification de code d'un site dans sites/, avant un commit de code, et quand l'utilisateur demande si « tout marche ».
argument-hint: "[dossier du site, ex. sites/boutique-dupont]"
---

# /verifier

Contrôle qualité d'un site client. Le script fait les vérifications ; ton rôle est
d'interpréter le résultat, de corriger ce qui doit l'être et d'en rendre compte.

## 1. Choisir le site

- Si un dossier est passé en argument (`$ARGUMENTS`), vérifie celui-là.
- Sinon, prends le site sur lequel porte la conversation.
- Sinon, s'il existe plusieurs sites dans `sites/`, demande lequel vérifier.

## 2. Lancer le script

Le script est `scripts/verify.sh`, dans le dossier de ce skill (chemin absolu
indiqué au chargement : « Base directory for this skill »). Appelle-le par ce
chemin absolu, entre guillemets : il contient un espace.

```bash
"<dossier-du-skill>/scripts/verify.sh" <dossier-du-site>
```

N'utilise pas `$CLAUDE_PROJECT_DIR` : cette variable n'existe que pour les hooks,
elle est vide dans le terminal de l'agent.

Il contrôle d'abord les **dépendances** (`npm audit` : failles connues des paquets
installés), puis exécute, dans cet ordre, les scripts npm du site : `format:check`,
`lint`, `typecheck`, `test`, `build`. Chaque étape est limitée à 600 s (variable
`VERIFIER_TIMEOUT`, 60 s pour l'audit avec `VERIFIER_AUDIT_TIMEOUT`) : au-delà, elle
est arrêtée avec tous ses processus.

L'étape Dépendances ne bloque (❌) que pour une faille **élevée ou critique** dans un
paquet livré avec le site (`dependencies`) : il tourne en ligne, face aux visiteurs.
Les failles mineures et celles des outils de développement (tests, lint) sont
signalées sur la ligne ✅ sans bloquer. Sans réponse du registre npm (hors
connexion) ou pour un projet qui n'utilise pas npm, la ligne est ℹ️ « non
vérifiées », sans bloquer.

Codes de sortie :
- `0` : tout est vert ;
- `1` : au moins une étape échoue (❌), dépasse le temps (⏱️) ou manque (⚠️) ;
- `2` : vérification impossible (JSON invalide, gestionnaire de paquets absent,
  dépendances non installées…). Le message dit quoi faire : applique-le si c'est
  sans risque (ex. `npm install`), sinon demande à l'utilisateur.

## Scripts exigés dans le package.json d'un site

| Script | Commande (stack par défaut) | Pourquoi |
|---|---|---|
| `format:check` | `prettier --check .` | |
| `lint` | `eslint --max-warnings=0` | Sans l'option, les avertissements passent au vert |
| `typecheck` | `next typegen && tsc --noEmit` | Sans `next typegen`, les types générés au build précédent provoquent de fausses erreurs après la suppression d'une page |
| `test` | `vitest run` | `run` : pas de mode surveillance. Le script lance chaque étape avec `CI=true`, qui force déjà Vitest à ne tourner qu'une fois, mais le `package.json` ne doit pas en dépendre |
| `build` | `next build` | |

## 3. Traiter le résultat

**Tout est vert** : dis-le en une ligne.

**Une étape échoue (❌)** :
1. Lis le journal indiqué et trouve la cause réelle, pas le symptôme.
2. Corrige le code. Ne désactive jamais une règle de lint, un test ou une
   vérification de types pour faire passer la vérification.
3. Relance `/verifier` jusqu'à ce que tout soit vert, ou jusqu'à ce qu'un problème
   demande une décision de l'utilisateur : dans ce cas, arrête-toi et explique.

**Les dépendances échouent (❌ Dépendances)** : ici, la correction n'est pas dans
le code du site, mais dans les versions de ses paquets.
1. Lis le journal : pour chaque paquet, `npm audit` donne la version qui corrige.
2. Mets à jour vers cette version **dans la même version majeure** quand c'est
   possible (`npm install --save-exact next@16.4.3` : la stack fixe la version
   exacte de Next.js), puis `npm audit fix` pour les paquets indirects.
3. N'utilise jamais `npm audit fix --force` sans avoir lu ce qu'il change : il peut
   installer une version majeure différente, voire plus ancienne.
4. Si une mise à jour demande de changer de version majeure d'un paquet du site,
   arrête-toi et explique-le à l'utilisateur : c'est une décision, pas un réflexe.
5. Si npm échoue avec `Cannot read properties of null (reading 'edgesOut')`, c'est
   un défaut de npm 10 : relance avec `npx -y npm@11 install`.
6. Relance `/verifier` : tout le site doit repasser au vert avec les nouvelles
   versions.

**Failles signalées sur une ligne verte** (mineures, outils de développement) :
mentionne-les à l'utilisateur et propose la mise à jour, sans la faire d'office.

**Dépendances non vérifiées (ℹ️)** : dis-le à l'utilisateur. Le site n'est pas
déclaré sain sur ce point tant que l'audit n'a pas pu tourner.

**Une étape dépasse le temps (⏱️)** : le script lance sans doute un mode
surveillance ou un serveur. Corrige le script dans le `package.json` (voir le
tableau ci-dessus), puis relance.

**Un script manque ou est mal configuré (⚠️)** : ajoute-le ou corrige-le dans le
`package.json` selon le tableau ci-dessus, puis relance.

## 4. Rendre compte

Termine par le rapport du script (les lignes ✅ / ❌ / ⚠️ / ℹ️), suivi, s'il y a eu des
corrections, d'une phrase par correction expliquant simplement le problème et ce
qui a été changé. L'utilisateur débute en web : pas de jargon sans explication.

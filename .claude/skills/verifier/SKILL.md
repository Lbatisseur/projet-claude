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

```bash
"$CLAUDE_PROJECT_DIR"/.claude/skills/verifier/scripts/verify.sh <dossier-du-site>
```

Il exécute, dans cet ordre, les scripts npm du site : `format:check`, `lint`,
`typecheck`, `test`, `build`. Chaque étape est limitée à 600 s (variable
`VERIFIER_TIMEOUT`) : au-delà, elle est arrêtée avec tous ses processus.

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
| `test` | `vitest run` | `run` : pas de mode surveillance, qui ne se termine jamais |
| `build` | `next build` | |

## 3. Traiter le résultat

**Tout est vert** : dis-le en une ligne.

**Une étape échoue (❌)** :
1. Lis le journal indiqué et trouve la cause réelle, pas le symptôme.
2. Corrige le code. Ne désactive jamais une règle de lint, un test ou une
   vérification de types pour faire passer la vérification.
3. Relance `/verifier` jusqu'à ce que tout soit vert, ou jusqu'à ce qu'un problème
   demande une décision de l'utilisateur : dans ce cas, arrête-toi et explique.

**Une étape dépasse le temps (⏱️)** : le script lance sans doute un mode
surveillance ou un serveur. Corrige le script dans le `package.json` (voir le
tableau ci-dessus), puis relance.

**Un script manque ou est mal configuré (⚠️)** : ajoute-le ou corrige-le dans le
`package.json` selon le tableau ci-dessus, puis relance.

## 4. Rendre compte

Termine par le rapport du script (les lignes ✅ / ❌ / ⚠️), suivi, s'il y a eu des
corrections, d'une phrase par correction expliquant simplement le problème et ce
qui a été changé. L'utilisateur débute en web : pas de jargon sans explication.

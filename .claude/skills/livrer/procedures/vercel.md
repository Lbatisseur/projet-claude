# Procédure : Vercel

Suivie par `/livrer` quand l'hébergeur du site est Vercel. `<site>` est le chemin
absolu du site, `<identifiant>` son nom de dossier (`demo-maison-lumen`), qui sert
aussi de nom de projet chez Vercel.

## L'outil

L'outil en ligne de commande de Vercel, lancé par `npx` dans une version fixée :

```bash
npx -y vercel@65.2.0 <commande> --cwd "<site>"
```

Avant chaque livraison, compare avec la dernière version (`npm view vercel
version`) : passe à la plus récente si elle l'est depuis quelques jours, et mets à
jour ce fichier.

**Interdit** (le hook `protect-secrets` le bloque) : `env pull`, `pull` et
`env run`, qui recopient les clés en clair. Pour savoir quelles variables existent,
`env ls` suffit : il n'affiche que les noms.

## 1. Connexion

```bash
npx -y vercel@65.2.0 whoami
```

Non connecté : demande à l'utilisateur de taper lui-même
`! npx -y vercel@65.2.0 login` (connexion dans le navigateur ; tu ne vois jamais ses
identifiants), puis relance `whoami`. Vérifie que le compte est celui prévu par la
ligne « Hébergeur » du cadrage (compte du prestataire, ou compte du client).

## 2. Projet

Premier déploiement seulement (sinon `<site>/.vercel/project.json` existe déjà) :

```bash
npx -y vercel@65.2.0 link --yes --project <identifiant> --cwd "<site>"
```

Il crée le projet chez Vercel et le lien local `<site>/.vercel/` (exclu de git par
le `.gitignore` du site : vérifie-le). Vercel reconnaît Next.js tout seul.

Constaté au premier déploiement (2026-10-26), `link` fait aussi deux choses sans
le demander :

- **Il tente de relier le dépôt GitHub au projet.** S'il y parvient, chaque push
  mettrait le site en ligne sans passer par `/livrer`. Avant le premier
  déploiement, le site doit donc avoir un `vercel.json` qui coupe ces déploiements
  automatiques (à committer, et à noter dans le journal de la fiche) :

  ```json
  {
    "$schema": "https://openapi.vercel.sh/vercel.json",
    "git": { "deploymentEnabled": false }
  }
  ```

- **Il écrit un `.env.local`** contenant un jeton temporaire d'accès aux services
  de Vercel (`VERCEL_OIDC_TOKEN`). Le fichier est exclu de git ; ne le lis jamais
  (le hook l'interdit de toute façon).

## 3. Variables d'environnement

Liste les variables nécessaires d'après `<site>/.env.example`, puis celles déjà
connues de Vercel :

```bash
npx -y vercel@65.2.0 env ls --environment production --cwd "<site>"
```

Pour chaque variable manquante, donne à l'utilisateur la commande à taper lui-même,
et ce qu'il doit y mettre :

```
! npx -y vercel@65.2.0 env add <NOM> production --sensitive --cwd "<site>"
```

| Variable | Recette | Mise en ligne |
|---|---|---|
| Clé Stripe | Clé de **test** (`sk_test_…`) : compte de test du prestataire pour une démo, mode test du compte du client sinon | Clé **réelle restreinte** du client (`rk_live_…`, droits limités à la création des paiements) |
| Adresse du site (`SITE_URL`) | `https://<identifiant>.vercel.app` | `https://<domaine>` |

N'utilise jamais `--value` : la valeur passerait par toi. Changer une variable
demande de redéployer pour qu'elle soit prise en compte.

## 4. Déployer

```bash
npx -y vercel@65.2.0 deploy --prod --yes --cwd "<site>"
```

Le hook `confirmer-production` demande la confirmation de l'utilisateur. Piloté
par un agent, l'outil répond en JSON : il donne l'adresse du déploiement et
l'adresse stable du site, `https://<identifiant>.vercel.app`. Vérifie ensuite :

```bash
npx -y vercel@65.2.0 inspect <adresse-du-déploiement> --cwd "<site>"
curl -s -o /dev/null -w "%{http_code}\n" https://<identifiant>.vercel.app
```

`inspect` doit afficher `status ● Ready`, `target production` et l'adresse stable
dans « Aliases » ; `curl` doit répondre `200` : le site est public, sans connexion à
Vercel (une page de connexion ou un `401` signale une protection des déploiements
activée sur le projet).

Échec de construction : lis le journal affiché. Si `/verifier` passe en local, la
cause est presque toujours une différence d'environnement (variable manquante,
version de Node) : corrige-la, ne contourne jamais une vérification.

## 5. Domaine (mise en ligne seulement)

```bash
npx -y vercel@65.2.0 domains add <domaine> <identifiant> --cwd "<site>"
npx -y vercel@65.2.0 domains inspect <domaine>
```

`inspect` donne les enregistrements DNS à créer chez le registraire du domaine (là
où il a été acheté). Selon la ligne « Nom de domaine » du cadrage, c'est
l'utilisateur ou le client qui les crée ; rédige-lui les valeurs exactes. Relance
`inspect` jusqu'à ce que le domaine soit vérifié (de quelques minutes à quelques
heures), puis redéploie.

## Revenir en arrière

Si la vérification en ligne échoue sur un site déjà ouvert au public :

```bash
npx -y vercel@65.2.0 rollback --cwd "<site>"
```

Le site revient instantanément à la version précédente ; la nouvelle reste
disponible pour comprendre le problème.

## Offres

L'offre gratuite (Hobby) interdit l'usage commercial : elle ne convient qu'aux
démonstrations. Un site client demande l'offre payante (Pro) sur le compte prévu
par le cadrage.

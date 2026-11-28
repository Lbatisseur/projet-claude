# Pièges rencontrés

Problèmes réellement rencontrés en construisant l'outillage et les sites, avec leur
parade. À relire avant de diagnostiquer un comportement étrange ou d'écrire une
commande inhabituelle. Les limites des hooks sont détaillées dans
[`hooks.md`](hooks.md), celles des sous-agents dans [`sous-agents.md`](sous-agents.md).

Chaque entrée : le symptôme, puis la parade.

## Shell (zsh) et macOS

- **zsh ne découpe pas une variable sans guillemets** : `for x in $liste` ou
  `set -- $p` reçoivent une seule chaîne. Parade : écrire les chemins en clair, ou
  utiliser un tableau. Statut de chaque commande d'un tube : `pipestatus`
  (minuscules, numéroté à partir de 1), pas le `PIPESTATUS` de bash.
- **`sed` de macOS ne connaît pas `\b`** : utiliser `perl -pe`.
- **Pas de commande `timeout`** sous macOS : la prévoir dans le script lui-même.
- **Le Python de python.org n'a pas les certificats racine** : une requête HTTPS
  échoue. Utiliser `curl`.
- **Pas de commande `trash`** : la Corbeille passe par Finder (voir la règle des
  suppressions dans [`CLAUDE.md`](../CLAUDE.md)).
- **Installer Node** : Homebrew compile `node@24` depuis les sources sur macOS 14
  (environ 1 h). Parade : archive officielle de nodejs.org, empreinte SHA-256
  vérifiée, dossier par version et lien `current` ; changer de version = nouvelle
  archive, nouveau lien (les outils npm globaux sont à réinstaller).

## Agent, outils d'écriture et git

- **Les outils d'écriture changent les échappements ` `, `­`… en vrais
  caractères invisibles** : une expression régulière JavaScript devient une erreur de
  syntaxe (Vitest affiche « aucun test »), un script SQL devient faux. Parade : écrire
  ces lignes par un petit script Python (`'\\u2028'`), puis contrôler les octets.
- **Retirer des lignes avec l'outil d'édition peut coller deux lignes** : toujours
  relire `git diff` après avoir annulé un sabotage.
- **Répartir sur plusieurs commits les changements d'un même fichier** avec des
  patchs sans contexte a déjà cassé un fichier. Parade : préparer chaque version du
  fichier à part, l'enregistrer avec `git hash-object -w` puis
  `git update-index --cacheinfo`, et vérifier l'instantané (`git archive
  $(git write-tree)` dans un dossier temporaire, puis compilation). Sinon, un commit
  par étape.
- **Le dossier courant de la session suit les sous-agents** : un `cd` dans un banc
  d'essai avant de lancer l'audit leur a montré le fichier des résultats attendus.
  Parade : passer des chemins absolus, ne jamais `cd` dans un banc d'essai.

## Next.js 16, Turbopack, Tailwind

- **Next.js 16.4** active par défaut `cacheComponents` et `partialPrefetching` ;
  `params` est une promesse ; `dynamicParams` n'est plus disponible. Une page à
  paramètre sans `generateStaticParams` + `ensureStatic: "navigation"` rend d'abord
  une coquille 200 pour un paramètre inconnu, puis garde un 404 en cache.
- **Types des routes** : `tsc` seul ne les connaît pas. Lancer le script
  `typecheck` du site (`next typegen` puis `tsc`).
- **CSS périmé d'un build à l'autre** avec `@tailwindcss/turbopack` 4.3.3 (version
  posée par create-next-app), y compris chez Vercel par le cache de build. Corrigé en
  4.3.4. En urgence : mettre `.next/cache/turbopack` à la Corbeille, et déployer
  avec `vercel deploy --force`.
- **Le navigateur garde une image en cache sous la même adresse** : remplacer une
  image, c'est lui donner un nouveau nom de fichier.
- **Les en-têtes HTTP (dont la CSP) ne s'appliquent qu'aux chargements complets** :
  une page atteinte par navigation interne ne les reçoit pas. Une CSP doit donc
  couvrir tout le site.
- **Nom accessible** : l'espace avant « : » disparaît quand le texte est coupé en
  plusieurs `span`. Parade : `aria-label`.
- **react-admin** réinitialise un formulaire quand `record` ou `defaultValues`
  changent (mise à jour en direct) : passer `resetOptions: { keepDirtyValues: true }`
  dans une **constante** (un objet écrit en ligne fait boucler le rendu).
- **Application installable (PWA)** : le service worker sert l'ancien build au
  premier rechargement après un déploiement.

## Tests (Vitest, PGlite, Testing Library)

- **Vitest ne contrôle pas les types** : tests verts, TypeScript rouge. D'où l'étape
  types de `/verifier`.
- **PGlite (PostgreSQL embarqué) n'a qu'une connexion** : une instance par fichier
  de test, vidée entre les tests (une instance par test dépassait le délai sous
  charge). Les verrous se testent par un espion qui enregistre le SQL ; deux
  transactions vraiment simultanées demandent une vraie base.
- **Expression régulière aux alternatives qui se chevauchent** : un test a bloqué
  Vitest plus de 2 minutes (retour arrière exponentiel). Garder les alternatives
  disjointes.
- **`Intl` en `fr-FR`** met une espace insécable (U+00A0) avant « € » : en tenir
  compte dans les attentes.
- **jsdom n'a pas `dialog.showModal`** : l'ajouter au prototype dans le test.
- **React 19** : un `setState` après un `await` sort de la transition, et un test
  qui lit l'écran tout de suite devient instable. Parade : `findByRole` (qui attend)
  plutôt que `getByRole` après un clic asynchrone.
- **Vitest en mode navigateur** : `vi.mock` par chemin échoue quand le chemin du
  projet contient une espace. Parade : `vi.stubGlobal`.
- **`grep -i ERR` sur la sortie de npm** attrape le paquet `es-errors` : lire le
  code de sortie de `npm ls`, pas son texte.
- **`import.meta.url` comparé à un chemin de `argv`** : faux quand le chemin contient
  une espace (encodée `%20`). Comparer avec `pathToFileURL(argv[1]).href`.

## Navigateur de test (Playwright)

- **Vercel BotID bloque Playwright** (il se présente comme HeadlessChrome) :
  l'envoi réel d'un formulaire protégé se fait à la main.
- **Bouton radio masqué** (stylé par son `label`) : cliquer sur le `label`.
- **Certains sites refusent un navigateur sans tête (403)** : ne pas contourner,
  demander des captures d'écran.
- **La traduction automatique de Chrome** modifie le texte affiché d'une page (pas
  la valeur enregistrée) : la couper avant de relire un texte.

## DNS, aperçu, Vercel

- **Cache DNS négatif** : consulter un domaine avant que son enregistrement existe
  fait garder la réponse « inexistant » par le Mac et la box (durée minimale de la
  zone, souvent 1 h). Parade : vérifier par `dig @1.1.1.1`, et tester le site avec
  `curl --resolve hôte:443:IP`.
- **Aperçu gratuit par tunnel Cloudflare** (`cloudflared tunnel --no-autoupdate
  --url http://localhost:<port>`) : l'adresse `*.trycloudflare.com` ne vit que tant
  que le Mac, le serveur et le tunnel tournent ; attendre que `dig @1.1.1.1` la
  résolve **avant** de l'ouvrir depuis le Mac (sinon, cache négatif ci-dessus).
  Les SHA-256 des notes de version de cloudflared sont ceux du binaire contenu dans
  l'archive, pas de l'archive elle-même ; vérifier aussi la signature Apple
  (« Cloudflare Inc. »).
- **`vercel link`** écrit un jeton dans le fichier d'environnement local (protégé
  par le hook des secrets) ; l'outil Vercel répond en JSON quand il détecte un agent.

## Paiement, services tiers, versions

- **API Stripe 2026-09-30** : `payment_method_types` est supprimé à la création
  d'une session Checkout ; c'est `allowed_payment_method_types`.
- **Le compte Stripe vu par le serveur MCP n'est pas forcément celui de la clé du
  site** : un code promo créé par le MCP était invisible pour le site. Créer les
  objets de test dans le tableau de bord du compte de la clé.
- **`stripe login` peut se relier à un autre compte que celui de la clé du site** :
  `stripe listen` écoute alors le mauvais compte, et aucun avis de paiement n'arrive
  au site (la commande reste « réservée »). Parade : `stripe listen --api-key <clé
  du site>` (le secret `whsec_…` est propre à chaque compte : le reprendre avec
  `--print-secret`).
- **Une page de paiement Stripe vit 30 minutes au moins** : pour essayer
  l'expiration sans attendre, `stripe checkout sessions expire <id> --api-key
  <clé>` envoie le même avis `checkout.session.expired`.
- **Module officiel de Mondial Relay** : plante avec jQuery 4 (`$.trim`,
  `$.isFunction` supprimés), d'où jQuery 3 figé ; charge Leaflet sans version figée
  et Google Fonts. Les identifiants de test publics de son API (WSI4) répondent
  « compte non activé » (STAT 95).
- **ESLint 10** refusé pour l'instant (extensions import, jsx-a11y et react de la
  config Next.js bloquées à 9) ; **TypeScript 7** aussi (typescript-eslint ne le lit
  pas). Chaque site note ses retenues dans la section « Versions retenues » de sa
  fiche, que `/entretenir` respecte.

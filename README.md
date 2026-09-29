<div align="center">

# Projet Claude

**Un environnement de développement agentique pour concevoir et livrer des sites e-commerce sur mesure avec Claude Code.**

![Claude Code](https://img.shields.io/badge/Claude_Code-agentique-D97757?style=flat-square)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Stripe](https://img.shields.io/badge/Stripe-635BFF?style=flat-square&logo=stripe&logoColor=white)
![Statut](https://img.shields.io/badge/statut-en_construction-orange?style=flat-square)

</div>

---

## Sommaire

- [Pourquoi ce projet](#pourquoi-ce-projet)
- [Architecture](#architecture)
- [Principes](#principes)
- [Structure du dépôt](#structure-du-dépôt)
- [Prérequis](#prérequis)
- [Feuille de route](#feuille-de-route)

## Pourquoi ce projet

Un agent de code IA est rapide, mais il démarre chaque session sans mémoire : il ignore
les conventions du projet, les erreurs déjà commises et les règles à ne jamais enfreindre.
Lui demander du code au coup par coup donne des résultats inégaux.

Ce dépôt prend le problème à l'envers : plutôt que d'écrire du code, on construit **le cadre
de travail de l'agent**, avec son contexte, ses procédures, ses garde-fous et ses relecteurs,
pour qu'il produise un résultat **fiable, vérifié et reproductible** d'un site client à l'autre.

## Architecture

L'environnement repose sur cinq briques de Claude Code, chacune répondant à un besoin précis :

```mermaid
flowchart LR
    A["CLAUDE.md<br/><i>que dois-je savoir ?</i>"] --> B["Skills<br/><i>comment faire ?</i>"]
    B --> C["Hooks<br/><i>qu'est-ce qui est interdit ?</i>"]
    C --> D["Sous-agents<br/><i>qui vérifie ?</i>"]
    D --> E["Workflows<br/><i>comment orchestrer ?</i>"]
```

| Brique | Rôle | Emplacement |
|---|---|---|
| **CLAUDE.md** | Contexte du projet chargé à chaque session : stack, conventions, règles | [`CLAUDE.md`](CLAUDE.md) |
| **Skills** | Procédures réutilisables déclenchées par `/commande` | `.claude/skills/` |
| **Hooks** | Garde-fous exécutés automatiquement, que l'agent ne peut pas contourner | `.claude/settings.json` |
| **Sous-agents** | Spécialistes au contexte isolé (relecture, sécurité, paiement) | `.claude/agents/` |
| **Workflows** | Orchestration de plusieurs agents en parallèle | `.claude/workflows/` |

## Principes

- **Consignes courtes, documentation ciblée.** `CLAUDE.md` reste concis ; le détail vit dans `docs/`.
- **Conseiller d'abord, bloquer ensuite.** Une règle devient un hook bloquant seulement quand une consigne ne suffit pas.
- **Protéger l'irréversible.** Les garde-fous portent sur les écritures, les suppressions et les secrets, pas sur la lecture.
- **Aucune perte de données.** Toute suppression passe par la Corbeille ; les suppressions définitives sont bloquées.
- **Aucun secret versionné.** Les fichiers `.env` sont exclus de Git et inaccessibles à l'agent.

## Structure du dépôt

```
.
├── CLAUDE.md          # Contexte chargé par Claude Code à chaque session
├── README.md
├── .claude/           # Outillage agentique (réglages, skills, hooks, agents)
├── docs/              # Documentation détaillée, un fichier par sujet
└── sites/             # Un dossier par site client
```

## Prérequis

| Outil | Version | Usage |
|---|---|---|
| [Claude Code](https://claude.com/claude-code) | 2.x | Agent de développement |
| [Node.js](https://nodejs.org) | ≥ 20 | Exécution des sites Next.js |
| [Git](https://git-scm.com) + [GitHub CLI](https://cli.github.com) | — | Versionnement et publication |

## Feuille de route

| # | Étape | Statut |
|---|---|---|
| 0 | Mise en place : Git, GitHub CLI, exclusion des secrets | ✅ |
| 1 | Contexte agent : `CLAUDE.md` | ✅ |
| 2 | Premier hook non bloquant : notification de fin de tâche | ⏳ |
| 3 | Skills : `/nouveau-site`, `/verifier`, `/livrer` | ⏳ |
| 4 | Hooks bloquants : protection des secrets, vérification avant fin de tâche | ⏳ |
| 5 | Sous-agents : relecteur sécurité et paiement | ⏳ |
| 6 | Serveurs MCP : navigateur, Stripe | ⏳ |
| 7 | Workflow : audit multi-agents avant livraison | ⏳ |
| 8 | Premier site e-commerce réalisé avec l'environnement complet | ⏳ |

---

<div align="center">
<sub>Conçu avec <a href="https://claude.com/claude-code">Claude Code</a>.</sub>
</div>

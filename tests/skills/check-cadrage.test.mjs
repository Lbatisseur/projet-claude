// Tests du contrôle de /cadrage : node --test tests/
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { ROOT } from "../hooks/helpers.mjs";

const SCRIPT = join(ROOT, ".claude/skills/cadrage/scripts/check-cadrage.mjs");
const MODELE = join(ROOT, ".claude/skills/cadrage/templates/CADRAGE.md");
const dossier = mkdtempSync(join(tmpdir(), "cadrage-"));

// Un cadrage complet et cohérent, que chaque test abîme d'une seule façon
const VALIDE = `# Cadrage : Maison Test

| | |
|---|---|
| Site | \`demo-test\` |
| Version | 2 |
| Mis à jour le | 2026-10-10 |
| Statut | Brouillon |

## Objectif

Vendre des bougies en ligne. Réussite : 20 commandes par mois.

## Clients visés

Particuliers, surtout sur téléphone.

## Catalogue

Douze bougies, sans variantes. Stock géré par la cliente (Q-01).

## Fonctionnalités

### Lancement

| ID | Fonctionnalité |
|---|---|
| F-01 | Catalogue des produits |
| F-02 | Paiement par carte \\| Apple Pay |

### Plus tard

| ID | Fonctionnalité |
|---|---|
| F-03 | Comptes clients |

### Hors périmètre

Marketplace multi-vendeurs.

## Critères d'acceptation

| ID | Fonctionnalité | Critère |
|---|---|---|
| CA-01 | F-01 | La page d'accueil affiche les douze produits avec leur prix TTC |
| CA-02 | F-02 | Un paiement refusé affiche un message et laisse le panier intact |
| CA-03 | F-02 | Un paiement réussi mène à une page de confirmation |

## Paiement et livraison

Stripe sur le compte de la cliente. Colissimo en France métropolitaine.

## Obligations légales

| Obligation | Statut |
|---|---|
| Mentions légales (identité de l'entreprise, hébergeur) | Fourni |
| Conditions générales de vente | À demander |
| Droit de rétractation de 14 jours et ses exceptions | À rédiger |
| Politique de confidentialité (RGPD) | À rédiger |
| Consentement aux cookies non essentiels | Sans objet |
| Médiateur de la consommation | À demander |
| Prix TTC et frais de livraison affichés avant la commande | À rédiger |
| Bouton « Commander avec obligation de paiement » | À intégrer |

## Contenus et identité visuelle

Photos fournies par la cliente.

## Contraintes

En ligne avant le 1er décembre.

## Choix techniques

Aucun écart : catalogue dans un fichier du dépôt.

## Mise en ligne

| Élément | Choix | Raison |
|---|---|---|
| Hébergeur | Vercel, compte du prestataire | Petit trafic, aucun serveur à maintenir |
| Nom de domaine | maison-test.fr, au nom de la cliente | C'est sa marque |
| Paiement de l'hébergement | Prestataire, refacturé | Inclus dans la maintenance |
| Compte Stripe | Compte de la cliente | Elle reçoit l'argent |

## Questions ouvertes

| ID | Question | À qui | Bloquante |
|---|---|---|---|
| Q-01 | Qui met le stock \\| les prix à jour ? | Cliente | Non |
| Q-02 | Quel médiateur ? | Cliente | Oui |

## Historique

| Version | Date | Changement |
|---|---|---|
| 1 | 2026-10-09 | Premier cadrage |
| 2 | 2026-10-10 | Ajout d'Apple Pay |
`;

let n = 0;
function controler(contenu) {
  const fichier = join(dossier, `cadrage-${++n}.md`);
  writeFileSync(fichier, contenu);
  return spawnSync("node", [SCRIPT, fichier], { encoding: "utf8" });
}
/** Remplace une chaîne qui doit exister (sinon le test lui-même est faux). */
function abimer(cherche, remplace) {
  assert.ok(VALIDE.includes(cherche), `chaîne introuvable dans le cadrage de référence : ${cherche}`);
  return VALIDE.replace(cherche, remplace);
}
function assertConforme(r) {
  assert.equal(r.status, 0, `devait être conforme — ${r.stdout}${r.stderr}`);
  assert.match(r.stdout, /✅/);
}
function assertRefuse(r, motif) {
  assert.equal(r.status, 1, `devait être refusé — code ${r.status}\n${r.stdout}${r.stderr}`);
  assert.match(r.stdout, motif);
}

describe("check-cadrage : accepte un cadrage complet", () => {
  test("cadrage de référence", () => {
    const r = controler(VALIDE);
    assertConforme(r);
    assert.match(r.stdout, /2 fonctionnalité\(s\) au lancement, 3 critère\(s\), 2 question\(s\)/);
  });
  test("fins de ligne Windows (CRLF)", () => assertConforme(controler(VALIDE.replace(/\n/g, "\r\n"))));
  test("validé, sans question bloquante", () => {
    const sansBloquante = abimer("| Cliente | Oui |", "| Cliente | Non |");
    assertConforme(controler(sansBloquante.replace("| Statut | Brouillon |", "| Statut | Validé par le client le 2026-10-10 |")));
  });
  test("mise en ligne à décider, avec sa question ouverte", () => {
    assertConforme(controler(abimer("| Hébergeur | Vercel, compte du prestataire |", "| Hébergeur | À décider (Q-01) |")));
  });
  test("aucune question ouverte, rien de prévu plus tard", () => {
    const sansQuestions = VALIDE.replace(/\| Q-0[12] .*\n/g, "").replace(" (Q-01)", "");
    assertConforme(controler(sansQuestions.replace("| F-03 | Comptes clients |\n", "")));
  });
});

describe("check-cadrage : refuse un cadrage incomplet ou incohérent", () => {
  const cas = [
    ["modèle brut, jamais rempli", () => readFileSync(MODELE, "utf8"), /Variable du modèle/],
    ["variable restée", () => abimer("Maison Test", "{{NOM}}"), /Variable du modèle/],
    ["version non numérique", () => abimer("| Version | 2 |", "| Version | deux |"), /version absente/],
    ["statut inconnu", () => abimer("| Statut | Brouillon |", "| Statut | Presque fini |"), /statut « Presque fini »/],
    ["validé sans date", () => abimer("| Statut | Brouillon |", "| Statut | Validé |"), /statut « Validé »/],
    ["validé avec une question bloquante", () => abimer("| Statut | Brouillon |", "| Statut | Validé par le client le 2026-10-10 |"), /Q-02 est bloquante/],
    ["section supprimée", () => abimer("## Contraintes\n\nEn ligne avant le 1er décembre.\n", ""), /Section manquante : ## Contraintes/],
    ["section renommée", () => abimer("## Catalogue", "## Produits"), /Section manquante : ## Catalogue/],
    ["section laissée en commentaire", () => abimer("Photos fournies par la cliente.", "<!-- Photos ? -->"), /Section vide : ## Contenus/],
    ["sous-section supprimée", () => abimer("### Plus tard", "### Ensuite"), /Sous-section manquante : ### Plus tard/],
    ["hors périmètre vide", () => abimer("Marketplace multi-vendeurs.", ""), /Sous-section vide : ### Hors périmètre/],
    ["aucune fonctionnalité au lancement", () => VALIDE.replace(/\| F-0[12] \|.*\n/g, ""), /Lancement : aucune fonctionnalité/],
    ["identifiant mal formé", () => abimer("| F-01 | Catalogue", "| F1 | Catalogue"), /identifiant « F1 » invalide/],
    ["identifiant en double", () => abimer("| F-02 | Paiement", "| F-01 | Paiement"), /F-01 en double/],
    ["fonctionnalité sans libellé", () => abimer("| F-01 | Catalogue des produits |", "| F-01 | |"), /F-01 sans libellé/],
    ["même fonctionnalité au lancement et plus tard", () => abimer("| F-03 | Comptes", "| F-02 | Comptes"), /F-02 figure à la fois/],
    ["fonctionnalité sans critère", () => abimer("| CA-01 | F-01 |", "| CA-01 | F-02 |"), /F-01 n'a aucun critère/],
    ["critère sur une fonctionnalité prévue plus tard", () => abimer("| CA-03 | F-02 |", "| CA-03 | F-03 |"), /CA-03 porte sur F-03, prévue plus tard/],
    ["critère sur une fonctionnalité inexistante", () => abimer("| CA-03 | F-02 |", "| CA-03 | F-09 |"), /CA-03 porte sur « F-09 »/],
    ["critère vide", () => abimer("Un paiement réussi mène à une page de confirmation", ""), /CA-03 sans libellé/],
    ["critère en double", () => abimer("| CA-03 |", "| CA-02 |"), /CA-02 en double/],
    ["obligation légale supprimée", () => abimer("| Médiateur de la consommation | À demander |\n", ""), /Obligation légale absente : Médiateur/],
    ["obligation légale non statuée", () => abimer("| Conditions générales de vente | À demander |", "| Conditions générales de vente | |"), /Conditions générales de vente » : statut «  »/],
    ["statut légal inventé", () => abimer("| Consentement aux cookies non essentiels | Sans objet |", "| Consentement aux cookies non essentiels | OK |"), /statut « OK »/],
    ["question sans réponse « Bloquante »", () => abimer("| Cliente | Non |", "| Cliente | peut-être |"), /Q-01 : colonne « Bloquante »/],
    ["question en double", () => abimer("| Q-02 |", "| Q-01 |"), /Q-01 en double/],
    ["renvoi à une question inexistante", () => abimer("(Q-01)", "(Q-07)"), /Référence à Q-07/],
    ["renvoi à une fonctionnalité inexistante", () => abimer("Marketplace multi-vendeurs.", "Voir F-12."), /Référence à F-12/],
    ["section Mise en ligne supprimée", () => abimer("## Mise en ligne", "## Hébergement"), /Section manquante : ## Mise en ligne/],
    ["ligne Mise en ligne supprimée", () => abimer("| Compte Stripe | Compte de la cliente | Elle reçoit l'argent |\n", ""), /Mise en ligne : ligne « Compte Stripe » absente/],
    ["choix de mise en ligne vide", () => abimer("| Hébergeur | Vercel, compte du prestataire |", "| Hébergeur | |"), /Mise en ligne : « Hébergeur » sans choix/],
    ["mise en ligne à décider sans question", () => abimer("| Hébergeur | Vercel, compte du prestataire |", "| Hébergeur | À décider |"), /« Hébergeur » à décider sans question ouverte/],
  ];
  for (const [nom, fabrique, motif] of cas) {
    test(nom, () => {
      assertRefuse(controler(fabrique()), motif);
    });
  }
  test("plusieurs défauts sont tous signalés", () => {
    const r = controler(abimer("## Contraintes", "## Délais").replace("| Version | 2 |", "| Version | |"));
    assertRefuse(r, /2 problème\(s\)/);
  });
});

describe("check-cadrage : erreurs d'usage", () => {
  test("sans argument", () => {
    const r = spawnSync("node", [SCRIPT], { encoding: "utf8" });
    assert.equal(r.status, 2);
    assert.match(r.stderr, /Usage/);
  });
  test("fichier absent", () => {
    const r = spawnSync("node", [SCRIPT, join(dossier, "absent.md")], { encoding: "utf8" });
    assert.equal(r.status, 2);
    assert.match(r.stderr, /Fichier illisible.*ENOENT/);
  });
});

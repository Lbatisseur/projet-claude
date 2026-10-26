// Tests des prérequis de /livrer : node --test tests/
// Chaque test fabrique un vrai dépôt git temporaire contenant un site, à partir du
// cahier des charges (conforme) de la boutique saine du banc d'essai de /auditer.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { ROOT } from "../hooks/helpers.mjs";

const SCRIPT = join(ROOT, ".claude/skills/livrer/scripts/prerequis.mjs");
const CADRAGE = readFileSync(join(ROOT, "tests/agents/auditer/boutique-saine/CADRAGE.md"), "utf8");
const base = mkdtempSync(join(tmpdir(), "livrer-"));

const HEBERGEUR = "| Hébergeur                 | Vercel, compte du prestataire";
const DOMAINE = "| Nom de domaine            | savonnerie-ondine.fr, au nom de la cliente (Q-01)";

/** Remplace une chaîne qui doit exister (sinon le test lui-même est faux). */
function modifier(texte, cherche, remplace) {
  assert.ok(texte.includes(cherche), `chaîne introuvable : ${cherche}`);
  return texte.replace(cherche, remplace);
}

let n = 0;
/** Un dépôt git avec un site committé ; `sousDossier` : le site n'est qu'une partie du dépôt. */
function depot({ cadrage = CADRAGE, sousDossier = false, git = true } = {}) {
  const racine = join(base, `depot-${++n}`);
  const site = sousDossier ? join(racine, "sites", "boutique") : racine;
  mkdirSync(site, { recursive: true });
  writeFileSync(join(site, "package.json"), '{"name":"boutique"}\n');
  if (cadrage !== null) writeFileSync(join(site, "CADRAGE.md"), cadrage);
  if (git) {
    const g = (...args) => spawnSync("git", ["-C", racine, ...args], { encoding: "utf8" });
    g("init", "-q");
    g("-c", "user.name=Test", "-c", "user.email=test@example.org", "add", ".");
    g("-c", "user.name=Test", "-c", "user.email=test@example.org", "commit", "-q", "-m", "init");
  }
  return { racine, site };
}

function prerequis(site, etape) {
  return spawnSync("node", [SCRIPT, site, etape].filter(Boolean), { encoding: "utf8" });
}
function assertPret(r) {
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /^PROCÉDURE vercel$/m);
}
function assertManque(r, motif) {
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout, motif);
  assert.match(r.stdout, /RÉSULTAT : prérequis manquants/);
  assert.doesNotMatch(r.stdout, /PROCÉDURE/);
}

describe("prerequis.mjs : site prêt", () => {
  test("recette", () => assertPret(prerequis(depot().site, "recette")));
  test("mise en ligne (cadrage validé, tous les choix faits)", () => {
    assertPret(prerequis(depot().site, "mise-en-ligne"));
  });
  test("le numéro de commit livré est affiché", () => {
    assert.match(prerequis(depot().site, "recette").stdout, /✅ Code committé \(commit [0-9a-f]{7,}\)/);
  });
  test("site dans un sous-dossier : une modification ailleurs dans le dépôt ne compte pas", () => {
    const { racine, site } = depot({ sousDossier: true });
    writeFileSync(join(racine, "autre.md"), "brouillon");
    assertPret(prerequis(site, "recette"));
  });
});

describe("prerequis.mjs : choix de mise en ligne", () => {
  test("hébergeur à décider : pas de recette", () => {
    const { site } = depot({ cadrage: modifier(CADRAGE, HEBERGEUR, "| Hébergeur | À décider (Q-01)") });
    assertManque(prerequis(site, "recette"), /❌ Hébergeur : À décider \(Q-01\)/);
  });
  test("domaine à décider : recette possible", () => {
    const { site } = depot({ cadrage: modifier(CADRAGE, DOMAINE, "| Nom de domaine | À décider (Q-01)") });
    assertPret(prerequis(site, "recette"));
  });
  test("domaine à décider : pas de mise en ligne", () => {
    const { site } = depot({ cadrage: modifier(CADRAGE, DOMAINE, "| Nom de domaine | À décider (Q-01)") });
    assertManque(prerequis(site, "mise-en-ligne"), /❌ Nom de domaine : À décider/);
  });
  test("hébergeur sans procédure écrite : à construire d'abord", () => {
    const { site } = depot({ cadrage: modifier(CADRAGE, HEBERGEUR, "| Hébergeur | Petit serveur loué (VPS)") });
    assertManque(prerequis(site, "recette"), /❌ Aucune procédure pour « Petit serveur loué \(VPS\) »/);
  });
});

describe("prerequis.mjs : cahier des charges", () => {
  test("absent", () => {
    assertManque(prerequis(depot({ cadrage: null }).site, "recette"), /❌ Cahier des charges absent/);
  });
  test("non conforme (section Mise en ligne supprimée)", () => {
    const { site } = depot({ cadrage: modifier(CADRAGE, "## Mise en ligne", "## Hébergement") });
    assertManque(prerequis(site, "recette"), /❌ Cahier des charges non conforme[\s\S]*Section manquante : ## Mise en ligne/);
  });
  test("brouillon : recette possible", () => {
    const brouillon = CADRAGE.replace(/\| Statut +\| [^|]+\|/, "| Statut | Brouillon |");
    assertPret(prerequis(depot({ cadrage: brouillon }).site, "recette"));
  });
  test("brouillon : pas de mise en ligne", () => {
    const brouillon = CADRAGE.replace(/\| Statut +\| [^|]+\|/, "| Statut | Brouillon |");
    assertManque(prerequis(depot({ cadrage: brouillon }).site, "mise-en-ligne"), /❌ Cahier des charges « Brouillon »/);
  });
});

describe("prerequis.mjs : code committé", () => {
  test("fichier modifié", () => {
    const { site } = depot();
    writeFileSync(join(site, "package.json"), '{"name":"boutique","version":"2"}\n');
    assertManque(prerequis(site, "recette"), /❌ Modifications non committées dans le site \(1 fichier\(s\)\)/);
  });
  test("nouveau fichier jamais committé", () => {
    const { site } = depot();
    writeFileSync(join(site, "nouveau.ts"), "export {};\n");
    assertManque(prerequis(site, "recette"), /❌ Modifications non committées/);
  });
  test("site hors de tout dépôt git", () => {
    const { site } = depot({ git: false });
    assertManque(prerequis(site, "recette"), /❌ Le site n'est pas dans un dépôt git/);
  });
});

describe("prerequis.mjs : erreurs d'usage", () => {
  test("sans argument", () => {
    const r = prerequis();
    assert.equal(r.status, 2);
    assert.match(r.stderr, /Usage/);
  });
  test("étape inconnue", () => {
    const r = prerequis(depot().site, "production");
    assert.equal(r.status, 2);
    assert.match(r.stderr, /Usage/);
  });
  test("dossier sans package.json", () => {
    const r = prerequis(join(base, "nulle-part"), "recette");
    assert.equal(r.status, 2);
    assert.match(r.stderr, /Site introuvable/);
  });
});

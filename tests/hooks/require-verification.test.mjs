// Tests du hook Stop require-verification : node --test "tests/**/*.test.mjs"
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, renameSync, utimesSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, test } from "node:test";
import { ROOT, runHook } from "./helpers.mjs";

const HOOK = ".claude/hooks/require-verification.sh";
const HIER = new Date(Date.now() - 86_400_000);
const MAINTENANT = new Date();

/** Crée un faux projet : { "sites/x/src/a.ts": HIER, ... } → fichiers datés. */
function projet(fichiers) {
  const racine = mkdtempSync(join(tmpdir(), "require-verification-"));
  for (const [chemin, date] of Object.entries(fichiers)) {
    const complet = join(racine, chemin);
    mkdirSync(dirname(complet), { recursive: true });
    writeFileSync(complet, "");
    utimesSync(complet, date, date);
  }
  return racine;
}

const stop = (racine, stopHookActive = false) =>
  runHook(HOOK, { hook_event_name: "Stop", stop_hook_active: stopHookActive }, {
    env: { CLAUDE_PROJECT_DIR: racine },
    cwd: racine,
  });

const TAMPON = ".claude/state/verifier/boutique.ok";

describe("require-verification", () => {
  test("aucun site : laisse terminer", () => {
    assert.equal(stop(projet({ "README.md": HIER })).status, 0);
  });

  test("site jamais vérifié : bloque et nomme le site", () => {
    const r = stop(projet({ "sites/boutique/package.json": HIER }));
    assert.equal(r.status, 2);
    assert.match(r.stderr, /sites\/boutique/);
  });

  test("site vérifié après sa dernière modification : laisse terminer", () => {
    const r = stop(projet({ "sites/boutique/package.json": HIER, "sites/boutique/src/page.tsx": HIER, [TAMPON]: MAINTENANT }));
    assert.equal(r.status, 0);
  });

  test("fichier modifié après la vérification : bloque", () => {
    const r = stop(projet({ "sites/boutique/package.json": HIER, [TAMPON]: HIER, "sites/boutique/src/page.tsx": MAINTENANT }));
    assert.equal(r.status, 2);
    assert.match(r.stderr, /sites\/boutique/);
  });

  test("seuls node_modules, .next et fichiers régénérés ont changé : laisse terminer", () => {
    const r = stop(projet({
      "sites/boutique/package.json": HIER,
      [TAMPON]: HIER,
      "sites/boutique/node_modules/x/index.js": MAINTENANT,
      "sites/boutique/.next/cache/a": MAINTENANT,
      "sites/boutique/next-env.d.ts": MAINTENANT,
      "sites/boutique/tsconfig.tsbuildinfo": MAINTENANT,
    }));
    assert.equal(r.status, 0);
  });

  test("plusieurs sites : ne signale que ceux qui sont non vérifiés", () => {
    const r = stop(projet({
      "sites/boutique/package.json": HIER, [TAMPON]: MAINTENANT,
      "sites/atelier/package.json": HIER,
    }));
    assert.equal(r.status, 2);
    assert.match(r.stderr, /sites\/atelier/);
    assert.doesNotMatch(r.stderr, /sites\/boutique/);
  });

  test("dossier sans package.json : ignoré", () => {
    assert.equal(stop(projet({ "sites/notes/idees.md": MAINTENANT })).status, 0);
  });

  test("anti-boucle : déjà relancé une fois, laisse terminer et prévient l'utilisateur", () => {
    const r = stop(projet({ "sites/boutique/package.json": HIER }), true);
    assert.equal(r.status, 0);
    const sortie = JSON.parse(r.stdout);
    assert.match(sortie.systemMessage, /non vérifié.*sites\/boutique/);
  });

  test("entrée invalide : se base quand même sur l'état des sites", () => {
    const racine = projet({ "sites/boutique/package.json": HIER });
    const r = runHook(HOOK, "{{{", { env: { CLAUDE_PROJECT_DIR: racine }, cwd: racine });
    assert.equal(r.status, 2);
  });
});

// Empreinte (campagne d'attaque du 2026-09-30) : une suppression, un renommage ou
// une copie qui garde sa date ne rendent aucun fichier plus récent que le tampon.
describe("require-verification : empreinte du site", () => {
  const SITE = "sites/boutique";
  /** Site vérifié hier : tampon contenant l'empreinte, comme l'écrit /verifier. */
  function siteVerifie() {
    const racine = projet({ [`${SITE}/package.json`]: HIER, [`${SITE}/src/a.ts`]: HIER, [`${SITE}/src/b.ts`]: HIER });
    const empreinte = spawnSync(`${ROOT}${HOOK}`, ["--empreinte", join(racine, SITE)], { encoding: "utf8" }).stdout;
    assert.match(empreinte, /^[0-9a-f]{64}$/m);
    mkdirSync(join(racine, ".claude/state/verifier"), { recursive: true });
    writeFileSync(join(racine, TAMPON), empreinte);
    utimesSync(join(racine, TAMPON), MAINTENANT, MAINTENANT);
    return racine;
  }
  const fichier = (racine, chemin, date = HIER) => {
    mkdirSync(dirname(join(racine, chemin)), { recursive: true });
    writeFileSync(join(racine, chemin), "x");
    utimesSync(join(racine, chemin), date, date);
  };

  test("rien n'a changé : laisse terminer", () => {
    assert.equal(stop(siteVerifie()).status, 0);
  });

  test("fichier supprimé : bloque", () => {
    const racine = siteVerifie();
    renameSync(join(racine, `${SITE}/src/b.ts`), join(racine, "b-hors-site.ts"));
    assert.equal(stop(racine).status, 2);
  });

  test("fichier renommé : bloque", () => {
    const racine = siteVerifie();
    renameSync(join(racine, `${SITE}/src/b.ts`), join(racine, `${SITE}/src/c.ts`));
    assert.equal(stop(racine).status, 2);
  });

  test("fichier ajouté avec une date ancienne (cp -p) : bloque", () => {
    const racine = siteVerifie();
    fichier(racine, `${SITE}/src/copie.ts`);
    assert.equal(stop(racine).status, 2);
  });

  test(".DS_Store, node_modules, .next et fichiers régénérés : ignorés", () => {
    const racine = siteVerifie();
    for (const f of ["src/.DS_Store", "node_modules/x/i.js", ".next/b", "next-env.d.ts", "tsconfig.tsbuildinfo"]) {
      fichier(racine, `${SITE}/${f}`);
    }
    assert.equal(stop(racine).status, 0);
  });
});

// Tests du hook Stop require-verification : node --test "tests/**/*.test.mjs"
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, test } from "node:test";
import { runHook } from "./helpers.mjs";

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

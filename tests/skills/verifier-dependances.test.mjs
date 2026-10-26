// Tests de l'étape « Dépendances » de /verifier : node --test tests/
// Un faux « npm » remplace le vrai : ses scripts réussissent, et « npm audit »
// renvoie le rapport que le test lui donne, sans réseau. Le rapport des paquets
// du site (--omit=dev) et celui de tous les paquets sont distincts, comme en vrai.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { ROOT } from "../hooks/helpers.mjs";

const SCRIPT = join(ROOT, ".claude/skills/verifier/scripts/verify.sh");
const base = mkdtempSync(join(tmpdir(), "verifier-"));

const FAUX_GESTIONNAIRE = `#!/bin/sh
case "$1" in
  run) exit 0 ;;
  audit)
    rapport="$FAUX_AUDIT_TOUT"
    for a in "$@"; do [ "$a" = "--omit=dev" ] && rapport="$FAUX_AUDIT_SITE"; done
    case "$rapport" in
      "") echo '{"error":{"code":"ENOTFOUND","summary":"request to registry failed"}}'; exit 1 ;;
      lent) exec sleep 30 ;;
      *) cat "$rapport"; exit 1 ;;
    esac ;;
esac
exit 0`;

const binaires = join(base, "bin");
mkdirSync(binaires);
for (const nom of ["npm", "pnpm"]) {
  writeFileSync(join(binaires, nom), FAUX_GESTIONNAIRE);
  chmodSync(join(binaires, nom), 0o755);
}

let n = 0;
/** Un rapport au format de « npm audit --json » (version 2). */
function rapport(graves = {}, { moderate = 0, low = 0 } = {}) {
  const vulnerabilities = Object.fromEntries(
    Object.entries(graves).map(([nom, severity]) => [nom, { name: nom, severity }]),
  );
  const compte = (niveau) => Object.values(graves).filter((s) => s === niveau).length;
  const fichier = join(base, `rapport-${++n}.json`);
  writeFileSync(
    fichier,
    JSON.stringify({
      auditReportVersion: 2,
      vulnerabilities,
      metadata: {
        vulnerabilities: {
          info: 0,
          low,
          moderate,
          high: compte("high"),
          critical: compte("critical"),
          total: Object.keys(graves).length + moderate + low,
        },
      },
    }),
  );
  return fichier;
}

function fauxSite({ verrou } = {}) {
  const dossier = join(base, `site-${++n}`);
  mkdirSync(join(dossier, "node_modules"), { recursive: true });
  const scripts = {
    "format:check": "prettier --check .",
    lint: "eslint --max-warnings=0",
    typecheck: "tsc --noEmit",
    test: "vitest run",
    build: "next build",
  };
  writeFileSync(join(dossier, "package.json"), JSON.stringify({ name: "faux", scripts }));
  if (verrou) writeFileSync(join(dossier, verrou), "");
  return dossier;
}

function verifier({ site = fauxSite(), env = {} } = {}) {
  const r = spawnSync(SCRIPT, [site], {
    encoding: "utf8",
    env: { ...process.env, PATH: `${binaires}:${process.env.PATH}`, ...env },
  });
  const ligne = r.stdout.split("\n").find((l) => l.includes("Dépendances")) ?? "";
  return { ...r, ligne };
}

describe("verify.sh : étape Dépendances", () => {
  test("aucune faille : vert", () => {
    const vide = rapport();
    const r = verifier({ env: { FAUX_AUDIT_SITE: vide, FAUX_AUDIT_TOUT: vide } });
    assert.equal(r.status, 0, r.stdout);
    assert.match(r.ligne, /^✅ Dépendances \(\d+s\)$/);
  });

  test("faille critique dans un paquet du site : échec, paquet nommé, rapport affiché", () => {
    const r = verifier({ env: { FAUX_AUDIT_SITE: rapport({ next: "critical" }) } });
    assert.equal(r.status, 1, r.stdout);
    assert.match(r.ligne, /^❌ Dépendances — 1 faille\(s\) grave\(s\) dans les paquets du site en ligne \(next\)/);
    assert.match(r.stdout, /── dependances : 40 dernières lignes ──/);
    assert.match(r.stdout, /RÉSULTAT : échec/);
  });

  test("une faille élevée suffit aussi à bloquer", () => {
    const r = verifier({ env: { FAUX_AUDIT_SITE: rapport({ zod: "high" }) } });
    assert.equal(r.status, 1, r.stdout);
    assert.match(r.ligne, /^❌ .*\(zod\)/);
  });

  test("plusieurs paquets graves : tous nommés", () => {
    const r = verifier({
      env: { FAUX_AUDIT_SITE: rapport({ next: "critical", zod: "high", sharp: "high" }) },
    });
    assert.equal(r.status, 1);
    assert.match(r.ligne, /3 faille\(s\) grave\(s\) .*\(next, zod, sharp\)/);
  });

  test("failles mineures seulement : vert, mais signalées", () => {
    const mineures = rapport({}, { moderate: 1, low: 1 });
    const r = verifier({ env: { FAUX_AUDIT_SITE: mineures, FAUX_AUDIT_TOUT: mineures } });
    assert.equal(r.status, 0, r.stdout);
    assert.match(r.ligne, /^✅ Dépendances .* ; 2 faille\(s\) mineure\(s\), voir npm audit$/);
  });

  test("failles graves dans les outils de développement seulement : vert, mais signalées", () => {
    const r = verifier({
      env: {
        FAUX_AUDIT_SITE: rapport(),
        FAUX_AUDIT_TOUT: rapport({ vitest: "critical", tinypool: "critical" }),
      },
    });
    assert.equal(r.status, 0, r.stdout);
    assert.match(
      r.ligne,
      /outils de développement : 2 faille\(s\) grave\(s\) \(vitest, tinypool\), à mettre à jour$/,
    );
  });

  test("registre injoignable : non vérifiée, sans bloquer", () => {
    const r = verifier();
    assert.equal(r.status, 0, r.stdout);
    assert.match(r.ligne, /^ℹ️ {2}Dépendances — non vérifiées : npm audit n'a pas répondu/);
  });

  test("sortie illisible : non vérifiée, jamais un faux vert", () => {
    const tronque = join(base, "tronque.json");
    writeFileSync(tronque, '{"auditReportVersion":2,"vulnerabilities":{"next":');
    const r = verifier({ env: { FAUX_AUDIT_SITE: tronque } });
    assert.equal(r.status, 0);
    assert.match(r.ligne, /^ℹ️ {2}Dépendances — non vérifiées/);
  });

  test("audit qui ne répond pas : arrêté après le délai, non vérifiée", () => {
    const debut = Date.now();
    const r = verifier({ env: { FAUX_AUDIT_SITE: "lent", VERIFIER_AUDIT_TIMEOUT: "1" } });
    assert.ok(Date.now() - debut < 15000, "le délai n'a pas été respecté");
    assert.equal(r.status, 0);
    assert.match(r.ligne, /^ℹ️ {2}Dépendances — non vérifiées/);
  });

  test("projet pnpm : non vérifiée, l'audit est prévu pour npm seulement", () => {
    const r = verifier({
      site: fauxSite({ verrou: "pnpm-lock.yaml" }),
      env: { FAUX_AUDIT_SITE: rapport({ next: "critical" }) },
    });
    assert.equal(r.status, 0);
    assert.match(r.ligne, /^ℹ️ {2}Dépendances — non vérifiées : .*n'est prévu que pour npm$/);
  });

  test("une faille n'empêche pas les autres étapes de tourner", () => {
    const r = verifier({ env: { FAUX_AUDIT_SITE: rapport({ next: "critical" }) } });
    for (const etape of ["Formatage", "Lint", "Types TypeScript", "Tests", "Build de production"]) {
      assert.match(r.stdout, new RegExp(`✅ ${etape}`));
    }
  });
});

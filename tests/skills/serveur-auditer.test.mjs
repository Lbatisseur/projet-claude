// Tests du script de démarrage de /auditer : node --test tests/
// Un faux « next » imite next start : il écoute sur le port demandé et lance un
// processus enfant, ou bien plante, ou bien ne répond jamais.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, test } from "node:test";
import { ROOT } from "../hooks/helpers.mjs";

const SCRIPT = join(ROOT, ".claude/skills/auditer/scripts/serveur.sh");
const ETAT = join(ROOT, ".claude/state/auditer");
const base = mkdtempSync(join(tmpdir(), "auditer-"));

const COMPORTEMENTS = {
  // Écoute sur le port passé après -p, et garde un processus enfant (comme next start)
  normal: `sleep 300 &
echo $! > enfant.pid
exec node -e 'require("http").createServer((q, r) => r.end("ok")).listen(+process.argv[1])' "$3"`,
  plante: `echo "Error: Could not find a production build" >&2; exit 1`,
  muet: `echo $$ > muet.pid
exec sleep 300`,
};

let n = 0;
function fauxSite(comportement = "normal", { build = true, dependances = true } = {}) {
  const dossier = join(base, `faux-site-${process.pid}-${++n}`);
  mkdirSync(join(dossier, "node_modules/.bin"), { recursive: true });
  writeFileSync(join(dossier, "package.json"), "{}");
  if (build) {
    mkdirSync(join(dossier, ".next"));
    writeFileSync(join(dossier, ".next/BUILD_ID"), "test");
  }
  if (dependances) {
    const next = join(dossier, "node_modules/.bin/next");
    writeFileSync(next, `#!/bin/bash\n${COMPORTEMENTS[comportement]}\n`);
    chmodSync(next, 0o755);
  }
  return dossier;
}
const lancer = (action, dossier, env = {}) =>
  spawnSync(SCRIPT, [action, dossier].filter(Boolean), { encoding: "utf8", env: { ...process.env, ...env } });
const fiche = (dossier) => readFileSync(join(ETAT, `${dossier.split("/").pop()}.serveur`), "utf8").trim();
const vivant = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};
const repond = (url) => spawnSync("curl", ["-s", "--max-time", "2", url], { encoding: "utf8" }).stdout === "ok";

const aArreter = [];
after(() => aArreter.forEach((d) => lancer("stop", d)));

describe("serveur.sh : démarrage et arrêt", () => {
  test("démarre, répond, puis s'arrête avec ses processus enfants", () => {
    const site = fauxSite();
    aArreter.push(site);
    const r = lancer("start", site);
    assert.equal(r.status, 0, r.stderr);
    const url = r.stdout.match(/^URL (http:\/\/localhost:(\d+))$/m);
    assert.ok(url, `adresse absente : ${r.stdout}`);
    assert.ok(+url[2] >= 3100 && +url[2] <= 3199);
    assert.ok(repond(url[1]), "le serveur doit répondre après la fin du script");

    const [pid] = fiche(site).split(" ").map(Number);
    const enfant = Number(readFileSync(join(site, "enfant.pid"), "utf8"));
    assert.ok(vivant(enfant));

    const s = lancer("stop", site);
    assert.equal(s.status, 0);
    assert.ok(!vivant(pid), "le serveur doit être arrêté");
    assert.ok(!vivant(enfant), "son processus enfant aussi (arrêt du groupe entier)");
    assert.equal(fiche(site), "");
  });

  test("un port occupé est évité", async () => {
    // Si 3100 est déjà pris par autre chose, le test reste valable
    const occupant = createServer().listen(3100);
    await new Promise((ok) => occupant.once("listening", ok).once("error", ok));
    try {
      const site = fauxSite();
      aArreter.push(site);
      const r = lancer("start", site);
      assert.equal(r.status, 0, r.stderr);
      assert.doesNotMatch(r.stdout, /:3100$/m);
      assert.ok(repond(r.stdout.match(/URL (\S+)/)[1]));
    } finally {
      occupant.close();
    }
  });

  test("relancer arrête d'abord le serveur précédent du même site", () => {
    const site = fauxSite();
    aArreter.push(site);
    lancer("start", site);
    const [premier] = fiche(site).split(" ").map(Number);
    const r = lancer("start", site);
    assert.equal(r.status, 0, r.stderr);
    const [second] = fiche(site).split(" ").map(Number);
    assert.notEqual(premier, second);
    assert.ok(!vivant(premier), "l'ancien serveur ne doit pas rester orphelin");
  });

  test("arrêter un serveur qui ne tourne pas n'est pas une erreur", () => {
    const site = fauxSite();
    assert.equal(lancer("stop", site).status, 0);
    assert.equal(lancer("stop", site).status, 0);
  });
});

describe("serveur.sh : échecs signalés clairement", () => {
  test("serveur qui plante au démarrage : code 1 et fin du journal", () => {
    const site = fauxSite("plante");
    const r = lancer("start", site);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /arrêté au démarrage[\s\S]*Could not find a production build/);
    assert.equal(fiche(site), "");
  });

  test("serveur qui ne répond jamais : code 1 après le délai, rien ne reste en marche", () => {
    const site = fauxSite("muet");
    const r = lancer("start", site, { SERVEUR_ATTENTE: "2" });
    assert.equal(r.status, 1);
    assert.match(r.stderr, /ne répond pas après 2 s/);
    const pid = Number(readFileSync(join(site, "muet.pid"), "utf8"));
    assert.ok(!vivant(pid), "le serveur muet doit être arrêté");
    assert.equal(fiche(site), "");
  });

  const usages = [
    ["sans argument", [], /Usage/],
    ["action inconnue", ["restart", "x"], /Usage/],
    ["dossier inexistant", ["start", "/nulle/part"], /Site introuvable/],
  ];
  for (const [nom, args, motif] of usages) {
    test(nom, () => {
      const r = spawnSync(SCRIPT, args, { encoding: "utf8" });
      assert.equal(r.status, 2);
      assert.match(r.stderr, motif);
    });
  }
  test("site jamais construit : renvoie vers /verifier", () => {
    const r = lancer("start", fauxSite("normal", { build: false }));
    assert.equal(r.status, 2);
    assert.match(r.stderr, /\/verifier/);
  });
  test("dépendances absentes : renvoie vers npm install", () => {
    const r = lancer("start", fauxSite("normal", { dependances: false }));
    assert.equal(r.status, 2);
    assert.match(r.stderr, /npm install/);
  });
  test("chemin avec espace et barre finale", () => {
    const dossier = join(base, "dossier avec espace");
    mkdirSync(dossier);
    const site = fauxSite();
    const deplace = join(dossier, "site");
    spawnSync("mv", [site, deplace]);
    aArreter.push(deplace);
    const r = lancer("start", `${deplace}/`);
    assert.equal(r.status, 0, r.stderr);
    assert.ok(repond(r.stdout.match(/URL (\S+)/)[1]));
  });
});

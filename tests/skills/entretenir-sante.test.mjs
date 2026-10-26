// Tests du bilan de santé de /entretenir : node --test tests/
// Vrais serveurs web locaux (HTTP, et HTTPS avec des certificats fabriqués par
// openssl, expirant quand le test le veut), vrai dépôt git temporaire, et faux
// « npm » / « npx » qui renvoient le rapport voulu, sans réseau.
import assert from "node:assert/strict";
import { execFile, spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createServer as createHttp } from "node:http";
import { createServer as createHttps } from "node:https";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";
import { ROOT } from "../hooks/helpers.mjs";

const SCRIPT = join(ROOT, ".claude/skills/entretenir/scripts/sante.mjs");
const base = mkdtempSync(join(tmpdir(), "entretenir-"));

// ── Faux outils ────────────────────────────────────────────────────────
const binaires = join(base, "bin");
mkdirSync(binaires);
writeFileSync(
  join(binaires, "npm"),
  `#!/bin/sh
case "$1" in
  audit)
    rapport="$FAUX_AUDIT_TOUT"
    for a in "$@"; do [ "$a" = "--omit=dev" ] && rapport="$FAUX_AUDIT_SITE"; done
    [ -z "$rapport" ] && { echo '{"error":{"code":"ENOTFOUND"}}'; exit 1; }
    cat "$rapport"; exit 1 ;;
  outdated)
    [ -z "$FAUX_OUTDATED" ] && { echo '{"error":{"code":"ENOTFOUND"}}'; exit 1; }
    cat "$FAUX_OUTDATED"; exit 1 ;;
esac
exit 0
`,
);
writeFileSync(
  join(binaires, "npx"),
  `#!/bin/sh
[ -z "$FAUX_DEPLOIEMENT" ] && { echo "Error: not logged in" >&2; exit 1; }
echo "{\\"id\\":\\"$FAUX_DEPLOIEMENT\\",\\"readyState\\":\\"READY\\"}"
`,
);
chmodSync(join(binaires, "npm"), 0o755);
chmodSync(join(binaires, "npx"), 0o755);

let n = 0;
const fichier = (contenu) => {
  const f = join(base, `donnee-${++n}.json`);
  writeFileSync(f, JSON.stringify(contenu));
  return f;
};
const audit = (v = {}) =>
  fichier({
    auditReportVersion: 2,
    vulnerabilities: {},
    metadata: { vulnerabilities: { info: 0, low: 0, moderate: 0, high: 0, critical: 0, ...v } },
  });
const AUCUNE_FAILLE = audit();
const A_JOUR = fichier({});

// ── Serveurs web ───────────────────────────────────────────────────────
/** Date au format d'openssl (AAAAMMJJHHMMSSZ), décalée de `jours` jours. */
const dans = (jours) =>
  new Date(Date.now() + jours * 86400000).toISOString().replace(/[-:T]/g, "").slice(0, 14) + "Z";

/** Certificat auto-signé pour localhost, qui expire dans `jours` jours (négatif : déjà expiré). */
function certificat(jours) {
  const d = join(base, `cert-${++n}`);
  mkdirSync(d);
  const r = spawnSync("openssl", [
    "req", "-x509", "-newkey", "rsa:2048", "-nodes",
    "-not_before", dans(Math.min(jours, 0) - 30), "-not_after", dans(jours),
    "-keyout", join(d, "cle.pem"), "-out", join(d, "cert.pem"),
    "-subj", "/CN=localhost", "-addext", "subjectAltName=DNS:localhost",
  ], { encoding: "utf8" });
  assert.equal(r.status, 0, `openssl : ${r.stderr}`);
  return { key: readFileSync(join(d, "cle.pem")), cert: readFileSync(join(d, "cert.pem")), chemin: join(d, "cert.pem") };
}

const serveurs = [];
/** Démarre un serveur ; `reponse(req, res)` décide de la réponse. */
async function serveur(reponse, cert) {
  const s = cert ? createHttps({ key: cert.key, cert: cert.cert }, reponse) : createHttp(reponse);
  await new Promise((ok) => s.listen(0, "127.0.0.1", ok));
  serveurs.push(s);
  return `${cert ? "https" : "http"}://localhost:${s.address().port}/`;
}
after(() => serveurs.forEach((s) => s.close()));

const ok200 = (req, res) => res.end("ok");
let certs, sites;
before(async () => {
  certs = { valide: certificat(90), bientot: certificat(14), urgent: certificat(3), expire: certificat(-2) };
  sites = {
    sain: await serveur(ok200, certs.valide),
    http: await serveur(ok200),
    panne: await serveur((req, res) => { res.statusCode = 500; res.end(); }, certs.valide),
    lent: await serveur((req, res) => setTimeout(() => res.end("ok"), 400), certs.valide),
    muet: await serveur(() => {}, certs.valide),
    bientot: await serveur(ok200, certs.bientot),
    urgent: await serveur(ok200, certs.urgent),
    expire: await serveur(ok200, certs.expire),
  };
});

// ── Site livré, dans un vrai dépôt git ─────────────────────────────────
const git = (dossier, ...args) =>
  spawnSync("git", ["-C", dossier, "-c", "user.name=T", "-c", "user.email=t@example.org", ...args], { encoding: "utf8" });

/** Un site committé ; `lignes` : les lignes du tableau « En ligne » (le commit est ajouté). */
function siteLivre({ lignes, verrou = true, section = true } = {}) {
  const site = join(base, `site-${++n}`);
  mkdirSync(join(site, "src"), { recursive: true });
  writeFileSync(join(site, "package.json"), '{"name":"boutique"}\n');
  if (verrou) writeFileSync(join(site, "package-lock.json"), "{}\n");
  writeFileSync(join(site, "src/page.tsx"), "export default 1;\n");
  writeFileSync(join(site, "CLAUDE.md"), "# Fiche\n");
  git(site, "init", "-q");
  git(site, "add", ".");
  git(site, "commit", "-q", "-m", "init");
  const commit = git(site, "rev-parse", "--short", "HEAD").stdout.trim();
  const tableau = (lignes ?? [["Recette", sites.sain, "Vercel, projet `boutique`", "`dpl_ok`"]])
    .map(([etape, adresse, hebergeur, deploiement]) => `| ${etape} | ${adresse} | ${hebergeur} | ${deploiement} | \`${commit}\` | 2026-10-26 | 9 ✅ |`)
    .join("\n");
  const enLigne = `## En ligne\n\n| Étape | Adresse | Hébergeur | Déploiement | Commit | Date | Vérification |\n| --- | --- | --- | --- | --- | --- | --- |\n${tableau}\n\n## Journal\n`;
  writeFileSync(join(site, "CLAUDE.md"), `# Fiche\n\n${section ? enLigne : ""}`);
  git(site, "commit", "-qam", "fiche : en ligne");
  return { site, commit };
}

/** Lance le script sans bloquer : les serveurs de test tournent dans ce processus. */
function sante(site, env = {}) {
  return new Promise((fini) => {
    execFile(
      "node",
      [SCRIPT, site].filter(Boolean),
      {
        encoding: "utf8",
        env: {
          ...process.env,
          PATH: `${binaires}:${process.env.PATH}`,
          NODE_EXTRA_CA_CERTS: certs.valide.chemin,
          ENTRETENIR_LENT_MS: "200",
          ENTRETENIR_DELAI_MS: "1500",
          FAUX_AUDIT_SITE: AUCUNE_FAILLE,
          FAUX_AUDIT_TOUT: AUCUNE_FAILLE,
          FAUX_OUTDATED: A_JOUR,
          FAUX_DEPLOIEMENT: "dpl_ok",
          ...env,
        },
      },
      (erreur, stdout, stderr) => fini({ status: erreur ? erreur.code : 0, stdout, stderr }),
    );
  });
}
// Ligne d'un contrôle, quel que soit son symbole (✅, ⚠️ et ❌ n'ont pas la même longueur)
const ligne = (r, debut) => r.stdout.split("\n").find((l) => l.replace(/^[^\p{L}]+/u, "").startsWith(debut)) ?? "";

// Un certificat auto-signé n'est reconnu que s'il est déclaré au processus : chaque
// serveur HTTPS a son propre certificat, d'où NODE_EXTRA_CA_CERTS par cas.
const confiance = (cle) => ({ NODE_EXTRA_CA_CERTS: certs[cle].chemin });

describe("sante.mjs : site sain", () => {
  test("tout est vert", async () => {
    const r = await sante(siteLivre().site);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /✅ Disponibilité : https:\/\/localhost:\d+\/ répond 200 en \d+ ms/);
    assert.match(r.stdout, /✅ Certificat : valide jusqu'au \d{4}-\d{2}-\d{2} \(8\d jours\)/);
    assert.match(r.stdout, /✅ Déploiement : .* sert bien dpl_ok/);
    assert.match(r.stdout, /✅ Code : le dernier commit du site est celui livré/);
    assert.match(r.stdout, /✅ Dépendances : aucune faille connue/);
    assert.match(r.stdout, /✅ Versions : toutes les dépendances sont à jour/);
    assert.match(r.stdout, /BILAN : sain$/m);
  });
});

describe("sante.mjs : disponibilité", () => {
  test("erreur 500 : à corriger", async () => {
    const r = await sante(siteLivre({ lignes: [["Recette", sites.panne, "Vercel", "`dpl_ok`"]] }).site);
    assert.equal(r.status, 1);
    assert.match(ligne(r, "Disponibilité"), /^❌ .* répond 500/);
    assert.match(r.stdout, /BILAN : à corriger$/m);
  });
  test("lent : à surveiller", async () => {
    const r = await sante(siteLivre({ lignes: [["Recette", sites.lent, "Vercel", "`dpl_ok`"]] }).site);
    assert.match(ligne(r, "Disponibilité"), /^⚠️ +Disponibilité : .* répond 200, mais en \d+ ms \(lent\)/);
    assert.match(r.stdout, /BILAN : à surveiller$/m);
  });
  test("ne répond jamais : à corriger après le délai", async () => {
    const r = await sante(siteLivre({ lignes: [["Recette", sites.muet, "Vercel", "`dpl_ok`"]] }).site);
    assert.match(ligne(r, "Disponibilité"), /^❌ .* injoignable \(pas de réponse en 1\.5 s\)/);
  });
  test("injoignable (rien n'écoute)", async () => {
    // Un vrai port libre : ouvert puis refermé (fetch interdit certains ports, dont 1)
    const s = createHttp();
    await new Promise((ok) => s.listen(0, "127.0.0.1", ok));
    const { port } = s.address();
    await new Promise((ok) => s.close(ok));
    const r = await sante(siteLivre({ lignes: [["Recette", `https://localhost:${port}/`, "Vercel", "`dpl_ok`"]] }).site);
    assert.match(ligne(r, "Disponibilité"), /^❌ .* injoignable \(ECONNREFUSED\)/);
    assert.match(ligne(r, "Certificat"), /^❌ Certificat : connexion HTTPS impossible/);
  });
});

describe("sante.mjs : certificat HTTPS", () => {
  test("site en HTTP : à surveiller", async () => {
    const r = await sante(siteLivre({ lignes: [["Recette", sites.http, "Vercel", "`dpl_ok`"]] }).site);
    assert.match(ligne(r, "Certificat"), /^⚠️ +Certificat : .* n'est pas en HTTPS/);
  });
  test("expire dans 14 jours : renouvellement attendu, à surveiller", async () => {
    const r = await sante(siteLivre({ lignes: [["Recette", sites.bientot, "Vercel", "`dpl_ok`"]] }).site, confiance("bientot"));
    assert.match(ligne(r, "Certificat"), /^⚠️ +Certificat : expire dans 1[34] jours/);
  });
  test("expire dans 3 jours : à corriger", async () => {
    const r = await sante(siteLivre({ lignes: [["Recette", sites.urgent, "Vercel", "`dpl_ok`"]] }).site, confiance("urgent"));
    assert.match(ligne(r, "Certificat"), /^❌ Certificat : expire dans [23] jour\(s\)/);
  });
  test("expiré : à corriger", async () => {
    const r = await sante(siteLivre({ lignes: [["Recette", sites.expire, "Vercel", "`dpl_ok`"]] }).site, confiance("expire"));
    assert.match(ligne(r, "Certificat"), /^❌ Certificat : expiré depuis le/);
  });
});

describe("sante.mjs : déploiement en ligne (Vercel)", () => {
  test("un autre déploiement est en ligne : à corriger", async () => {
    const r = await sante(siteLivre().site, { FAUX_DEPLOIEMENT: "dpl_autre" });
    assert.equal(r.status, 1);
    assert.match(ligne(r, "Déploiement"), /^❌ .* sert dpl_autre au lieu de dpl_ok : mise en ligne faite hors de \/livrer/);
  });
  test("identifiant non noté dans la fiche", async () => {
    const r = await sante(siteLivre({ lignes: [["Recette", sites.sain, "Vercel", ""]] }).site);
    assert.match(ligne(r, "Déploiement"), /^⚠️ +Déploiement : identifiant non noté/);
  });
  test("outil Vercel non connecté : non vérifié", async () => {
    const r = await sante(siteLivre().site, { FAUX_DEPLOIEMENT: "" });
    assert.match(ligne(r, "Déploiement"), /^⚠️ +Déploiement : non vérifié .*vercel login/);
  });
  test("autre hébergeur : pas de contrôle Vercel", async () => {
    const r = await sante(siteLivre({ lignes: [["Recette", sites.sain, "Petit serveur loué (VPS)", ""]] }).site);
    assert.equal(ligne(r, "Déploiement"), "");
    assert.equal(r.status, 0, r.stdout);
  });
  test("recette et mise en ligne : chaque adresse est contrôlée", async () => {
    const { site } = siteLivre({
      lignes: [
        ["Recette", sites.sain, "Vercel", "`dpl_ok`"],
        ["Mise en ligne", sites.panne, "Vercel", "`dpl_ok`"],
      ],
    });
    const r = await sante(site);
    assert.equal(r.stdout.match(/Disponibilité/g).length, 2);
    assert.match(r.stdout, /❌ Disponibilité : .* répond 500/);
  });
});

describe("sante.mjs : code pas encore livré", () => {
  test("commit sur le code après la livraison : à surveiller", async () => {
    const { site } = siteLivre();
    writeFileSync(join(site, "src/page.tsx"), "export default 2;\n");
    git(site, "commit", "-qam", "nouvelle page");
    const r = await sante(site);
    assert.match(ligne(r, "Code"), /^⚠️ +Code : 1 commit\(s\) sur le site depuis la livraison/);
  });
  test("commit sur la fiche ou le cadrage seulement : rien en attente", async () => {
    const { site } = siteLivre();
    writeFileSync(join(site, "CADRAGE.md"), "# Cadrage\n");
    git(site, "add", ".");
    git(site, "commit", "-qm", "cadrage");
    const r = await sante(site);
    assert.match(ligne(r, "Code"), /^✅ Code : le dernier commit du site est celui livré/);
  });
});

describe("sante.mjs : dépendances et versions", () => {
  test("faille grave dans le site en ligne : à corriger", async () => {
    const r = await sante(siteLivre().site, { FAUX_AUDIT_SITE: audit({ critical: 1 }) });
    assert.equal(r.status, 1);
    assert.match(ligne(r, "Dépendances"), /^❌ Dépendances : 1 faille\(s\) grave\(s\) dans les paquets du site en ligne/);
  });
  test("failles mineures et outils de développement : à surveiller", async () => {
    const r = await sante(siteLivre().site, {
      FAUX_AUDIT_SITE: audit({ moderate: 2 }),
      FAUX_AUDIT_TOUT: audit({ moderate: 2, high: 3 }),
    });
    assert.match(ligne(r, "Dépendances"), /^⚠️ +Dépendances : 2 faille\(s\) mineure\(s\) .* ; 3 faille\(s\) grave\(s\) dans les outils de développement/);
  });
  test("npm audit sans réponse : non vérifiées", async () => {
    const r = await sante(siteLivre().site, { FAUX_AUDIT_SITE: "" });
    assert.match(ligne(r, "Dépendances"), /^⚠️ +Dépendances : non vérifiées \(npm audit/);
  });
  test("projet sans npm : non vérifiées", async () => {
    const r = await sante(siteLivre({ verrou: false }).site);
    assert.match(ligne(r, "Dépendances"), /^⚠️ +Dépendances : non vérifiées \(audit prévu pour npm seulement\)/);
  });
  test("mises à jour disponibles, majeure signalée", async () => {
    const retard = fichier({
      react: { current: "19.2.8", wanted: "19.3.1", latest: "19.3.1" },
      typescript: { current: "5.9.3", wanted: "5.9.3", latest: "7.0.2" },
    });
    const r = await sante(siteLivre().site, { FAUX_OUTDATED: retard });
    assert.match(
      ligne(r, "Versions"),
      /^⚠️ +Versions : 2 mise\(s\) à jour disponible\(s\) : react 19\.2\.8 → 19\.3\.1, typescript 5\.9\.3 → 7\.0\.2 \(version majeure\)$/,
    );
    assert.match(r.stdout, /BILAN : à surveiller$/m);
  });
  test("npm outdated sans réponse : non vérifiées", async () => {
    const r = await sante(siteLivre().site, { FAUX_OUTDATED: "" });
    assert.match(ligne(r, "Versions"), /^⚠️ +Versions : non vérifiées/);
  });
});

describe("sante.mjs : erreurs d'usage", () => {
  test("sans argument", async () => {
    const r = await sante(undefined);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /Usage/);
  });
  test("site jamais livré (pas de section « En ligne »)", async () => {
    const r = await sante(siteLivre({ section: false }).site);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /Site jamais livré/);
  });
  test("dossier sans site", async () => {
    const r = await sante(join(base, "nulle-part"));
    assert.equal(r.status, 2);
    assert.match(r.stderr, /Site introuvable/);
  });
});

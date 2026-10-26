#!/usr/bin/env node
// Bilan de santé d'un site en ligne, pour /entretenir.
//
// Usage : sante.mjs <dossier-du-site>
//
// Lit la section « En ligne » de la fiche du site (<site>/CLAUDE.md, tenue par
// /livrer), puis contrôle :
//   - pour chaque adresse en ligne : le site répond, son certificat HTTPS n'est
//     pas près d'expirer, et (Vercel) l'adresse sert bien le déploiement livré ;
//   - pour le site : commits pas encore livrés, failles connues des dépendances,
//     versions des dépendances en retard.
//
// Ne corrige rien : il constate. Les corrections passent par /verifier et /livrer.
//
// Sortie : une ligne ✅ / ⚠️ / ❌ par contrôle, puis « BILAN : sain »,
// « BILAN : à surveiller » (au moins un ⚠️) ou « BILAN : à corriger » (au moins un ❌).
// Codes de sortie : 0 = sain, 1 = à surveiller ou à corriger, 2 = usage ou site
// jamais livré.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { connect } from "node:tls";

const VERCEL = "vercel@65.2.0"; // même version que la procédure Vercel de /livrer
// Au-delà, une page d'accueil est lente pour un visiteur (réglable pour les tests)
const LENT_MS = Number(process.env.ENTRETENIR_LENT_MS ?? 3000);
const DELAI_MS = Number(process.env.ENTRETENIR_DELAI_MS ?? 15000);
// Un certificat se renouvelle normalement 30 jours avant son expiration
// (Let's Encrypt, utilisé par Vercel) : moins de 21 jours veut dire que le
// renouvellement a échoué ; moins de 7, que le site va bientôt afficher une alerte.
const CERT_ALERTE_JOURS = 21;
const CERT_URGENT_JOURS = 7;
// Documents du site, sans effet sur ce qu'il affiche
const DOCUMENTS = ["CLAUDE.md", "CADRAGE.md", "AGENTS.md", "README.md"];

const dossierArg = process.argv[2];
if (!dossierArg) {
  console.error("Usage : sante.mjs <dossier-du-site>");
  process.exit(2);
}
const site = resolve(dossierArg);
const fiche = join(site, "CLAUDE.md");
if (!existsSync(join(site, "package.json")) || !existsSync(fiche)) {
  console.error(`Site introuvable : ${site} (package.json ou CLAUDE.md absent)`);
  process.exit(2);
}

// ── Section « En ligne » de la fiche ───────────────────────────────────
const lignesFiche = readFileSync(fiche, "utf8").split(/\r?\n/);
const debut = lignesFiche.findIndex((l) => l.trim() === "## En ligne");
if (debut === -1) {
  console.error(`Site jamais livré : pas de section « ## En ligne » dans ${fiche}`);
  process.exit(2);
}
const fin = lignesFiche.findIndex((l, i) => i > debut && l.startsWith("## "));
const rangees = lignesFiche
  .slice(debut + 1, fin === -1 ? undefined : fin)
  .filter((l) => l.trim().startsWith("|"))
  .map((l) => l.trim().replace(/^\||\|$/g, "").split(/(?<!\\)\|/).map((c) => c.trim()));
const [entete = [], , ...donnees] = rangees;
const colonne = (nom) => entete.findIndex((c) => c.toLowerCase() === nom.toLowerCase());
const sansCode = (c) => (c ?? "").replace(/`/g, "").trim();
const livraisons = donnees.map((r) => ({
  etape: r[colonne("Étape")] ?? "?",
  adresse: (r[colonne("Adresse")] ?? "").match(/https?:\/\/\S+/)?.[0] ?? "",
  hebergeur: r[colonne("Hébergeur")] ?? "",
  deploiement: sansCode(r[colonne("Déploiement")]),
  commit: sansCode(r[colonne("Commit")]),
}));
if (livraisons.length === 0) {
  console.error("Site jamais livré : la section « En ligne » n'a aucune ligne");
  process.exit(2);
}

// ── Résultats ──────────────────────────────────────────────────────────
const lignes = [];
let pire = 0; // 0 = ✅, 1 = ⚠️, 2 = ❌
const noter = (niveau, texte) => {
  lignes.push(`${["✅", "⚠️ ", "❌"][niveau]} ${texte}`);
  pire = Math.max(pire, niveau);
};

/**
 * fetch ne dit que « fetch failed » : la vraie cause est plus loin dans la chaîne
 * des erreurs (e.cause, e.cause.cause…), parfois dans un groupe d'erreurs quand
 * Node a essayé plusieurs adresses (IPv4 puis IPv6). On garde le premier code
 * (ECONNREFUSED, ENOTFOUND…), sinon le message le plus précis.
 */
function causeReelle(e) {
  let message = e.message;
  for (let c = e, i = 0; c && i < 6; c = c.cause, i++) {
    const code = c.code ?? c.errors?.find((x) => x.code)?.code;
    if (code) return code;
    message = c.message || message;
  }
  return message;
}

/** Le site répond-il, et en combien de temps ? */
async function disponibilite(adresse) {
  const depart = Date.now();
  try {
    const r = await fetch(adresse, { redirect: "follow", signal: AbortSignal.timeout(DELAI_MS) });
    const ms = Date.now() - depart;
    if (!r.ok) return noter(2, `Disponibilité : ${adresse} répond ${r.status}`);
    if (ms > LENT_MS) return noter(1, `Disponibilité : ${adresse} répond ${r.status}, mais en ${ms} ms (lent)`);
    noter(0, `Disponibilité : ${adresse} répond ${r.status} en ${ms} ms`);
  } catch (e) {
    const cause = e.name === "TimeoutError" ? `pas de réponse en ${DELAI_MS / 1000} s` : causeReelle(e);
    noter(2, `Disponibilité : ${adresse} injoignable (${cause})`);
  }
}

/** Jours restants avant l'expiration du certificat HTTPS. */
function certificat(adresse) {
  const url = new URL(adresse);
  if (url.protocol !== "https:") {
    noter(1, `Certificat : ${adresse} n'est pas en HTTPS (le navigateur l'affiche « non sécurisé »)`);
    return Promise.resolve();
  }
  return new Promise((fini) => {
    // La confiance dans le certificat est vérifiée par le contrôle de
    // disponibilité ; ici on ne lit que sa date d'expiration.
    const socket = connect(
      { host: url.hostname, port: Number(url.port || 443), servername: url.hostname, rejectUnauthorized: false },
      () => {
        const expiration = new Date(socket.getPeerCertificate().valid_to);
        socket.end();
        const jours = Math.floor((expiration - Date.now()) / 86400000);
        const date = expiration.toISOString().slice(0, 10);
        if (Number.isNaN(jours)) noter(1, `Certificat : date d'expiration illisible`);
        else if (jours < 0) noter(2, `Certificat : expiré depuis le ${date}`);
        else if (jours < CERT_URGENT_JOURS) noter(2, `Certificat : expire dans ${jours} jour(s) (${date}), renouvellement en échec`);
        else if (jours < CERT_ALERTE_JOURS) noter(1, `Certificat : expire dans ${jours} jours (${date}), il aurait dû être renouvelé`);
        else noter(0, `Certificat : valide jusqu'au ${date} (${jours} jours)`);
        fini();
      },
    );
    socket.setTimeout(DELAI_MS, () => socket.destroy(new Error("délai dépassé")));
    socket.on("error", (e) => {
      noter(2, `Certificat : connexion HTTPS impossible (${e.code ?? e.message})`);
      fini();
    });
  });
}

/** L'adresse sert-elle le déploiement noté par /livrer ? (Vercel) */
function deploiement({ adresse, hebergeur, deploiement: attendu }) {
  if (!/\bvercel\b/i.test(hebergeur)) return;
  if (!attendu) {
    return noter(1, `Déploiement : identifiant non noté dans la fiche (colonne « Déploiement », remplie par /livrer)`);
  }
  const r = spawnSync("npx", ["-y", VERCEL, "inspect", adresse, "--json", "--cwd", site], {
    encoding: "utf8",
    timeout: 120000,
  });
  let id;
  try {
    id = JSON.parse(r.stdout).id;
  } catch {
    id = undefined;
  }
  if (!id) return noter(1, `Déploiement : non vérifié (outil Vercel sans réponse ou non connecté : lancer « vercel login »)`);
  if (id === attendu) noter(0, `Déploiement : ${adresse} sert bien ${attendu}, livré par /livrer`);
  else noter(2, `Déploiement : ${adresse} sert ${id} au lieu de ${attendu} : mise en ligne faite hors de /livrer, ou fiche pas à jour`);
}

/** Commits du site postérieurs au commit livré. */
function codeNonLivre(commit) {
  if (!commit) return noter(1, "Code : commit livré non noté dans la fiche");
  const git = (...args) => spawnSync("git", ["-C", site, ...args], { encoding: "utf8" });
  if (git("cat-file", "-e", `${commit}^{commit}`).status !== 0) {
    return noter(1, `Code : commit livré ${commit} introuvable dans le dépôt`);
  }
  // Les documents du site (fiche, cahier des charges) ne changent rien à ce que
  // voit le visiteur ; /livrer committe d'ailleurs la fiche juste après chaque
  // livraison. Ils ne comptent pas comme du code en attente.
  const apres = git("log", "--oneline", `${commit}..HEAD`, "--", ".", ...DOCUMENTS.map((f) => `:(exclude)${f}`)).stdout.trim();
  const n = apres ? apres.split("\n").length : 0;
  if (n === 0) noter(0, `Code : le dernier commit du site est celui livré (${commit})`);
  else noter(1, `Code : ${n} commit(s) sur le site depuis la livraison (${commit}), pas encore en ligne`);
}

/** Lance npm dans le site et lit sa sortie JSON (npm sort en erreur quand il trouve quelque chose). */
function npmJson(...args) {
  const r = spawnSync("npm", args, { cwd: site, encoding: "utf8", timeout: 120000 });
  try {
    return JSON.parse(r.stdout || "null");
  } catch {
    return null;
  }
}

/** Failles connues : graves dans le site en ligne → ❌ ; mineures ou outils de développement → ⚠️. */
function dependances() {
  if (!existsSync(join(site, "package-lock.json"))) {
    return noter(1, "Dépendances : non vérifiées (audit prévu pour npm seulement)");
  }
  const enLigne = npmJson("audit", "--omit=dev", "--json")?.metadata?.vulnerabilities;
  if (!enLigne) return noter(1, "Dépendances : non vérifiées (npm audit n'a pas répondu)");
  const graves = (enLigne.high ?? 0) + (enLigne.critical ?? 0);
  if (graves > 0) return noter(2, `Dépendances : ${graves} faille(s) grave(s) dans les paquets du site en ligne`);
  const mineures = (enLigne.moderate ?? 0) + (enLigne.low ?? 0);
  const tout = npmJson("audit", "--json")?.metadata?.vulnerabilities;
  const dev = tout ? (tout.high ?? 0) + (tout.critical ?? 0) : 0;
  if (mineures === 0 && dev === 0) return noter(0, "Dépendances : aucune faille connue");
  const details = [];
  if (mineures) details.push(`${mineures} faille(s) mineure(s) dans le site en ligne`);
  if (dev) details.push(`${dev} faille(s) grave(s) dans les outils de développement`);
  noter(1, `Dépendances : ${details.join(" ; ")}`);
}

/**
 * Versions retenues : section « ## Versions retenues » de la fiche, où l'on note
 * qu'un paquet reste dans une version majeure, pourquoi et depuis quand
 * (| Paquet | Reste en | Raison | Depuis |). Décision prise avec l'utilisateur.
 */
function versionsRetenues() {
  const debutR = lignesFiche.findIndex((l) => l.trim() === "## Versions retenues");
  if (debutR === -1) return new Map();
  const finR = lignesFiche.findIndex((l, i) => i > debutR && l.startsWith("## "));
  const [tete = [], , ...rangs] = lignesFiche
    .slice(debutR + 1, finR === -1 ? undefined : finR)
    .filter((l) => l.trim().startsWith("|"))
    .map((l) => l.trim().replace(/^\||\|$/g, "").split(/(?<!\\)\|/).map((c) => sansCode(c)));
  const col = (nom) => tete.findIndex((c) => c.toLowerCase() === nom.toLowerCase());
  return new Map(
    rangs
      .map((r) => [r[col("Paquet")], { majeur: Number(r[col("Reste en")]?.match(/^\d+/)?.[0]), depuis: r[col("Depuis")] }])
      .filter(([nom, r]) => nom && Number.isInteger(r.majeur)),
  );
}

// Au-delà, une décision d'attendre doit être réexaminée : elle ne doit pas
// devenir permanente par oubli
const RETENUE_MAX_JOURS = 90;

/** Dépendances directes en retard sur leur dernière version, hors versions retenues. */
function versions() {
  const retenues = versionsRetenues();
  for (const [nom, r] of retenues) {
    const age = (Date.now() - new Date(r.depuis)) / 86400000;
    if (age > RETENUE_MAX_JOURS) {
      noter(1, `Versions : retenue de ${nom} en ${r.majeur} depuis plus de 3 mois (${r.depuis}) : à réexaminer`);
    }
  }
  const retard = npmJson("outdated", "--json");
  if (retard === null || typeof retard !== "object" || "error" in retard) {
    return noter(1, "Versions : non vérifiées (npm outdated n'a pas répondu)");
  }
  const majeur = (v) => String(v).split(".")[0];
  const liste = [];
  const gardees = [];
  for (const [nom, v] of Object.entries(retard)) {
    if (!v?.latest || v.current === v.latest) continue;
    const retenue = retenues.get(nom);
    if (retenue && Number(majeur(v.latest)) > retenue.majeur) {
      // La version majeure suivante est écartée ; les mises à jour à l'intérieur
      // de la version retenue (« wanted », d'après package.json) restent signalées
      gardees.push(`${nom} en ${retenue.majeur}`);
      if (v.wanted && v.current !== v.wanted) liste.push(`${nom} ${v.current} → ${v.wanted}`);
      continue;
    }
    const saut = majeur(v.current ?? "?") !== majeur(v.latest) ? " (version majeure)" : "";
    liste.push(`${nom} ${v.current ?? "non installé"} → ${v.latest}${saut}`);
  }
  if (liste.length === 0) {
    const mention = gardees.length ? ` (${gardees.length} retenue(s) : ${gardees.join(", ")})` : "";
    return noter(0, gardees.length ? `Versions : à jour${mention}` : "Versions : toutes les dépendances sont à jour");
  }
  const mention = gardees.length ? ` ; retenue(s) : ${gardees.join(", ")}` : "";
  noter(1, `Versions : ${liste.length} mise(s) à jour disponible(s) : ${liste.join(", ")}${mention}`);
}

// ── Contrôles ──────────────────────────────────────────────────────────
for (const livraison of livraisons) {
  if (!livraison.adresse) {
    noter(1, `${livraison.etape} : adresse absente de la fiche`);
    continue;
  }
  await disponibilite(livraison.adresse);
  await certificat(livraison.adresse);
  deploiement(livraison);
}
const derniere = livraisons.at(-1);
codeNonLivre(derniere.commit);
dependances();
versions();

console.log(`Santé de ${site}\n`);
console.log(lignes.join("\n"));
console.log();
console.log(`BILAN : ${["sain", "à surveiller", "à corriger"][pire]}`);
process.exit(pire === 0 ? 0 : 1);

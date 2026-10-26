#!/usr/bin/env node
// Prérequis de /livrer : le site peut-il passer à l'étape demandée ?
//
// Usage : prerequis.mjs <dossier-du-site> <recette|mise-en-ligne>
//
// Vérifie le cahier des charges (contrôle de /cadrage), les choix de la section
// « Mise en ligne », l'existence d'une procédure pour l'hébergeur choisi, et que
// tout le code du site est committé : ce qui part en ligne doit correspondre à un
// commit précis, pour savoir exactement ce qui tourne et pouvoir y revenir.
//
// Ce script ne contacte aucun service : la connexion à l'hébergeur, /verifier et
// /auditer sont lancés par le skill.
//
// Sortie : une ligne ✅/❌ par contrôle, puis « PROCÉDURE <nom> » si tout est bon.
// Codes de sortie : 0 = prêt, 1 = prérequis manquants, 2 = usage ou site invalide.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ETAPES = ["recette", "mise-en-ligne"];
const ELEMENTS = ["Hébergeur", "Nom de domaine", "Paiement de l'hébergement", "Compte Stripe"];
// Hébergeurs dont la procédure est écrite (dossier procedures/ du skill)
const PROCEDURES = [["vercel", /\bvercel\b/i]];

const [dossierArg, etape] = process.argv.slice(2);
if (!dossierArg || !ETAPES.includes(etape)) {
  console.error("Usage : prerequis.mjs <dossier-du-site> <recette|mise-en-ligne>");
  process.exit(2);
}
const site = resolve(dossierArg);
if (!existsSync(join(site, "package.json"))) {
  console.error(`Site introuvable : ${site} (pas de package.json)`);
  process.exit(2);
}

const ici = dirname(fileURLToPath(import.meta.url));
const lignes = [];
let pret = true;
const ok = (texte) => lignes.push(`✅ ${texte}`);
const manque = (texte) => {
  lignes.push(`❌ ${texte}`);
  pret = false;
};

// 1. Cahier des charges : présent et conforme
const cadrage = join(site, "CADRAGE.md");
let texte = "";
if (!existsSync(cadrage)) {
  manque("Cahier des charges absent : lancer /cadrage");
} else {
  texte = readFileSync(cadrage, "utf8");
  const controle = spawnSync(process.execPath, [join(ici, "../../cadrage/scripts/check-cadrage.mjs"), cadrage], {
    encoding: "utf8",
  });
  if (controle.status === 0) ok("Cahier des charges conforme");
  else manque(`Cahier des charges non conforme : lancer le contrôle de /cadrage\n${controle.stdout.trim()}`);
}

// 2. Choix de mise en ligne
const lignesCadrage = texte.replace(/<!--[\s\S]*?-->/g, "").split(/\r?\n/);
const debut = lignesCadrage.findIndex((l) => l.trim() === "## Mise en ligne");
const fin = lignesCadrage.findIndex((l, i) => i > debut && l.startsWith("## "));
const choix = Object.fromEntries(
  (debut === -1 ? [] : lignesCadrage.slice(debut + 1, fin === -1 ? undefined : fin))
    .filter((l) => l.trim().startsWith("|"))
    .map((l) => l.trim().replace(/^\||\|$/g, "").split(/(?<!\\)\|/).map((c) => c.trim()))
    .map(([element, valeur]) => [element, valeur ?? ""]),
);
const decide = (element) => Boolean(choix[element]) && !/^À décider/i.test(choix[element]);

// La recette n'a besoin que de l'hébergeur ; la mise en ligne, de tous les choix
const requis = etape === "recette" ? ["Hébergeur"] : ELEMENTS;
for (const element of requis) {
  if (decide(element)) ok(`${element} : ${choix[element]}`);
  else manque(`${element} : ${choix[element] || "non renseigné"} — à décider avec le client, puis noter dans CADRAGE.md`);
}

// 3. Procédure de l'hébergeur
let procedure = null;
if (decide("Hébergeur")) {
  procedure = PROCEDURES.find(([, motif]) => motif.test(choix["Hébergeur"]))?.[0] ?? null;
  if (procedure) ok(`Procédure de mise en ligne : ${procedure}`);
  else manque(`Aucune procédure pour « ${choix["Hébergeur"]} » : à construire avec l'utilisateur avant de livrer`);
}

// 4. Mise en ligne : cahier des charges validé par le client
if (etape === "mise-en-ligne") {
  const statut = texte.match(/^\|\s*Statut\s*\|\s*(.*?)\s*\|/m)?.[1] ?? "";
  if (/^Validé par le client le /.test(statut)) ok(`Cahier des charges ${statut.toLowerCase()}`);
  else manque(`Cahier des charges « ${statut || "sans statut"} » : il doit être validé par le client avant la mise en ligne`);
}

// 5. Code committé (dépôt propre au site, ou dépôt qui le contient)
const git = (...args) => spawnSync("git", ["-C", site, ...args], { encoding: "utf8" });
if (git("rev-parse", "--is-inside-work-tree").stdout.trim() !== "true") {
  manque("Le site n'est pas dans un dépôt git : impossible de savoir quelle version part en ligne");
} else {
  const modifs = git("status", "--porcelain", "--", ".").stdout.trim();
  if (modifs) {
    manque(`Modifications non committées dans le site (${modifs.split("\n").length} fichier(s)) : committer avant de livrer`);
  } else {
    ok(`Code committé (commit ${git("rev-parse", "--short", "HEAD").stdout.trim()})`);
  }
}

console.log(`Prérequis de l'étape « ${etape} » pour ${site}\n`);
console.log(lignes.join("\n"));
console.log();
if (pret) {
  console.log(`PROCÉDURE ${procedure}`);
  process.exit(0);
}
console.log("RÉSULTAT : prérequis manquants.");
process.exit(1);

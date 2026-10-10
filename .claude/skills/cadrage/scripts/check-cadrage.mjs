#!/usr/bin/env node
// Contrôle d'un cahier des charges produit par /cadrage.
//
// Usage : check-cadrage.mjs <chemin/vers/CADRAGE.md>
//
// Vérifie la forme, pas le fond : sections présentes et remplies, identifiants
// uniques (F-01, CA-01, Q-01), chaque fonctionnalité du lancement couverte par au
// moins un critère d'acceptation, obligations légales toutes statuées, aucune
// question bloquante ouverte sur un cadrage validé.
//
// Codes de sortie : 0 = conforme, 1 = problèmes listés, 2 = fichier illisible.

import { readFileSync } from "node:fs";

const SECTIONS = [
  "Objectif",
  "Clients visés",
  "Catalogue",
  "Fonctionnalités",
  "Critères d'acceptation",
  "Paiement et livraison",
  "Obligations légales",
  "Contenus et identité visuelle",
  "Contraintes",
  "Choix techniques",
  "Questions ouvertes",
  "Historique",
];
// Sections rédigées en texte libre, qui ne peuvent pas rester vides
const PROSE = [
  "Objectif",
  "Clients visés",
  "Catalogue",
  "Paiement et livraison",
  "Contenus et identité visuelle",
  "Contraintes",
  "Choix techniques",
];
const SOUS_SECTIONS = ["Lancement", "Plus tard", "Hors périmètre"];
const OBLIGATIONS = [
  ["Mentions légales", /mentions l[ée]gales/i],
  ["Conditions générales de vente", /conditions g[ée]n[ée]rales de vente/i],
  ["Droit de rétractation", /r[ée]tractation/i],
  ["Politique de confidentialité", /confidentialit[ée]/i],
  ["Consentement aux cookies", /cookies/i],
  ["Médiateur de la consommation", /m[ée]diateur/i],
  ["Prix TTC", /TTC/],
  ["Bouton de commande", /obligation de paiement/i],
];
const STATUTS_LEGAUX = ["Fourni", "À rédiger", "À demander", "À intégrer", "Sans objet"];

const chemin = process.argv[2];
if (!chemin) {
  console.error("Usage : check-cadrage.mjs <chemin/vers/CADRAGE.md>");
  process.exit(2);
}
let texte;
try {
  texte = readFileSync(chemin, "utf8");
} catch (e) {
  console.error(`Fichier illisible : ${chemin} (${e.code ?? e.message})`);
  process.exit(2);
}

const problemes = [];
const signaler = (message) => problemes.push(message);

// Les commentaires HTML du modèle sont des consignes, pas du contenu
const lignes = texte.replace(/<!--[\s\S]*?-->/g, "").split(/\r?\n/);

/** Lignes d'une section, jusqu'au prochain titre de niveau égal ou supérieur. */
function section(titre, niveau = 2, source = lignes) {
  const marque = "#".repeat(niveau) + " ";
  const debut = source.findIndex((l) => l.startsWith(marque) && l.slice(marque.length).trim() === titre);
  if (debut === -1) return null;
  const fin = source.findIndex(
    (l, i) => i > debut && /^#{1,6} /.test(l) && l.match(/^#+/)[0].length <= niveau,
  );
  return source.slice(debut + 1, fin === -1 ? undefined : fin);
}

/** Lignes de données d'un tableau Markdown (sans l'en-tête ni la ligne de séparation). */
function tableau(contenu) {
  const rangees = (contenu ?? [])
    .filter((l) => l.trim().startsWith("|"))
    .map((l) =>
      l
        .trim()
        .replace(/^\||\|$/g, "")
        .split(/(?<!\\)\|/)
        .map((c) => c.trim()),
    );
  return rangees.slice(1).filter((r) => !r.every((c) => /^:?-+:?$/.test(c)));
}

const estVide = (contenu) => !(contenu ?? []).some((l) => l.trim() !== "");

// 1. Restes du modèle
if (texte.includes("{{")) signaler("Variable du modèle non remplacée ({{…}})");

// 2. En-tête : version et statut
const entete = Object.fromEntries(tableau(lignes.slice(0, lignes.findIndex((l) => l.startsWith("## ")))).map((r) => [r[0], r[1]]));
if (!/^\d+$/.test(entete["Version"] ?? "")) signaler("En-tête : version absente ou non numérique");
const statut = entete["Statut"] ?? "";
const valide = /^Validé par le client le \d{4}-\d{2}-\d{2}$/.test(statut);
if (statut !== "Brouillon" && !valide) {
  signaler(`En-tête : statut « ${statut} » invalide (attendu : Brouillon, ou Validé par le client le AAAA-MM-JJ)`);
}

// 3. Sections présentes, sections de texte remplies
for (const titre of SECTIONS) {
  if (section(titre) === null) signaler(`Section manquante : ## ${titre}`);
}
for (const titre of PROSE) {
  const contenu = section(titre);
  if (contenu !== null && estVide(contenu)) signaler(`Section vide : ## ${titre}`);
}
const fonctionnalites = section("Fonctionnalités") ?? [];
for (const titre of SOUS_SECTIONS) {
  if (section(titre, 3, fonctionnalites) === null) signaler(`Sous-section manquante : ### ${titre}`);
}
if (estVide(section("Hors périmètre", 3, fonctionnalites))) {
  signaler("Sous-section vide : ### Hors périmètre (écrire « Rien d'écarté pour l'instant » si c'est le cas)");
}

/** Contrôle une liste d'identifiants : format, unicité, libellé rempli. */
function identifiants(rangees, prefixe, lieu, colonneLibelle = 1) {
  const vus = new Set();
  for (const r of rangees) {
    const id = r[0] ?? "";
    if (!new RegExp(`^${prefixe}-\\d{2,}$`).test(id)) {
      signaler(`${lieu} : identifiant « ${id} » invalide (attendu ${prefixe}-01, ${prefixe}-02…)`);
      continue;
    }
    if (vus.has(id)) signaler(`${lieu} : identifiant ${id} en double`);
    vus.add(id);
    if (!r[colonneLibelle]) signaler(`${lieu} : ${id} sans libellé`);
  }
  return vus;
}

// 4. Fonctionnalités
const lancement = identifiants(tableau(section("Lancement", 3, fonctionnalites)), "F", "Lancement");
const plusTard = identifiants(tableau(section("Plus tard", 3, fonctionnalites)), "F", "Plus tard");
if (lancement.size === 0) signaler("Lancement : aucune fonctionnalité");
for (const id of plusTard) {
  if (lancement.has(id)) signaler(`${id} figure à la fois au lancement et plus tard`);
}

// 5. Critères d'acceptation
const criteres = tableau(section("Critères d'acceptation"));
identifiants(criteres, "CA", "Critères", 2);
const couvertes = new Set();
for (const [id, cible] of criteres) {
  if (!/^CA-\d{2,}$/.test(id ?? "")) continue;
  if (lancement.has(cible)) couvertes.add(cible);
  else if (plusTard.has(cible)) signaler(`${id} porte sur ${cible}, prévue plus tard : seul le lancement a des critères`);
  else signaler(`${id} porte sur « ${cible ?? ""} », absente du lancement`);
}
for (const id of lancement) {
  if (!couvertes.has(id)) signaler(`${id} n'a aucun critère d'acceptation`);
}

// 6. Obligations légales : toutes présentes, toutes statuées
const legales = tableau(section("Obligations légales"));
for (const [nom, motif] of OBLIGATIONS) {
  const rangee = legales.find((r) => motif.test(r[0] ?? ""));
  if (!rangee) signaler(`Obligation légale absente : ${nom}`);
  else if (!STATUTS_LEGAUX.includes(rangee[1] ?? "")) {
    signaler(`Obligation « ${nom} » : statut « ${rangee[1] ?? ""} » invalide (${STATUTS_LEGAUX.join(", ")})`);
  }
}

// 7. Questions ouvertes
const questions = tableau(section("Questions ouvertes"));
const qids = identifiants(questions, "Q", "Questions");
for (const [id, , , bloquante] of questions) {
  if (!/^Q-\d{2,}$/.test(id ?? "")) continue;
  if (!["Oui", "Non"].includes(bloquante)) signaler(`${id} : colonne « Bloquante » à remplir par Oui ou Non`);
  else if (bloquante === "Oui" && valide) signaler(`${id} est bloquante : le cadrage ne peut pas être validé`);
}

// 8. Références : tout F-, CA- ou Q- cité dans le texte doit exister
const definis = new Set([...lancement, ...plusTard, ...qids, ...criteres.map((r) => r[0])]);
const cites = new Set(lignes.join("\n").match(/\b(?:F|CA|Q)-\d{2,}\b/g) ?? []);
for (const id of [...cites].sort()) {
  if (!definis.has(id)) signaler(`Référence à ${id}, qui n'est défini nulle part`);
}

// Rapport
if (problemes.length === 0) {
  console.log(
    `✅ Cadrage conforme : ${lancement.size} fonctionnalité(s) au lancement, ` +
      `${criteres.length} critère(s), ${questions.length} question(s) ouverte(s) — statut : ${statut}`,
  );
  process.exit(0);
}
console.log(`❌ Cadrage incomplet : ${problemes.length} problème(s)`);
for (const p of problemes) console.log(`  - ${p}`);
process.exit(1);

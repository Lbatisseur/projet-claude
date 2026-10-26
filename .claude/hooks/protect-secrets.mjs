#!/usr/bin/env node
// Hook PreToolUse : interdit à l'agent de lire, écrire ou afficher un fichier secret
// (.env, .env.local, clés .pem/.key…), quel que soit l'outil utilisé,
// y compris les outils MCP (navigateur : envoi de fichier, capture, URL file://).
// Seul le modèle documenté .env.example reste accessible.
//
// Code de sortie 2 = action refusée (le message sur stderr est renvoyé à l'agent).
// Toute erreur interne laisse passer (code 0) : un garde-fou ne doit jamais
// bloquer la session par accident.

import { basename } from "node:path";

// Nom de fichier secret : .env, .env.local, .env.production…, .envrc (direnv),
// clés *.pem, *.key, *.p12, *.pfx, clés SSH privées (id_rsa, id_ed25519…), .netrc.
// Sans tenir compte de la casse : le disque d'un Mac ne la distingue pas,
// « .ENV.LOCAL » ouvre le fichier .env.local.
const SECRET_FILE =
  /^(\.env(\..+)?|\.envrc|.+\.(pem|key|p12|pfx)|id_(rsa|dsa|ecdsa|ed25519)(_sk)?|\.netrc)$/i;
const ALLOWED_FILE = /^\.env\.(example|sample|template)$/i;

// Dans une commande shell : un mot qui désigne un fichier secret, y compris écrit
// avec un joker (.env*, .env.loca?) ou collé à une ponctuation du shell
// (`cat .env`, {.env,x}, git show HEAD:.env).
const SECRET_IN_COMMAND =
  /(^|[\s"'=<>|;&(/`{,:])(\.env[\w.*?-]*|[\w.*?-]+\.(pem|key|p12|pfx)|id_(rsa|dsa|ecdsa|ed25519)(_sk)?|\.netrc)(?=$|[\s"'<>|;&)`},:])/gi;

// Outil Vercel : « env pull » et « pull » recopient les variables d'environnement
// du site (clés Stripe…) en clair dans un fichier au nom libre ; « env run » les
// injecte dans une commande quelconque (printenv). Cherché dans chaque morceau de
// la commande (séparé par ; & | ou retour à la ligne), sans tenir compte de la casse.
const VERCEL_SECRET_COMMAND = /(^|[\s"'(`/])(vercel|vc)(@\S*)?\s(.*\s)?(env\s+(pull|run)|pull)(?=$|[\s"')`])/i;
// Jeton de connexion de l'outil Vercel (~/Library/Application Support/com.vercel.cli/
// sur Mac, ~/.local/share/com.vercel.cli/ sous Linux) : il donne accès au compte.
const VERCEL_TOKEN_DIR = /com\.vercel\.cli/i;

function vercelSecretCommand(command) {
  return String(command)
    .split(/[;&|\n]/)
    .some((part) => VERCEL_SECRET_COMMAND.test(part));
}

function isSecretFile(path) {
  const name = basename(String(path));
  return SECRET_FILE.test(name) && !ALLOWED_FILE.test(name);
}

// Un joker qui commence comme .env peut désigner un secret : .env*, .e?v
function isSecretGlob(word) {
  return /[*?]/.test(word) && /^\.env/i.test(word) && !ALLOWED_FILE.test(word);
}

function secretsInCommand(command) {
  const found = [];
  for (const match of String(command).matchAll(SECRET_IN_COMMAND)) {
    const word = match[2];
    if (isSecretFile(word) || isSecretGlob(word)) found.push(word);
  }
  return found;
}

// Outils MCP (navigateur…) : chaque serveur nomme ses paramètres à sa façon.
// On parcourt tout l'argument et on retient les champs qui désignent un fichier
// (envoi, capture enregistrée…) ou une URL file://. Une URL http(s) vise une
// autre machine : elle n'expose pas les secrets du projet.
const PATH_KEY = /^(paths?|files?|file_?paths?|file_?names?)$/i;
const URL_KEY = /^(urls?|uri)$/i;

function mcpTargets(value, key = "", found = []) {
  if (Array.isArray(value)) {
    for (const item of value) mcpTargets(item, key, found);
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) mcpTargets(v, k, found);
  } else if (typeof value === "string") {
    if (PATH_KEY.test(key)) found.push(value);
    else if (URL_KEY.test(key) && /^file:/i.test(value)) found.push(fileUrlPath(value));
  }
  return found;
}

// file:///site/%2Eenv?x#y → /site/.env
function fileUrlPath(url) {
  const path = url.replace(/^file:(\/\/)?/i, "").split(/[?#]/)[0];
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

// Chemins et motifs touchés par l'appel d'outil
function targetsOf(tool, input) {
  if (String(tool).startsWith("mcp__")) return mcpTargets(input);
  switch (tool) {
    case "Read":
    case "Write":
    case "Edit":
    case "MultiEdit":
      return [input.file_path];
    case "NotebookEdit":
      return [input.notebook_path];
    case "Grep":
      return [input.path, input.glob];
    case "Glob":
      return [input.pattern];
    default:
      return [];
  }
}

function deny(reason) {
  process.stderr.write(
    `BLOQUÉ : ${reason}\n` +
      "Les secrets (.env, clés) ne sont jamais lus ni écrits par l'agent. " +
      "Documenter la variable dans .env.example (sans valeur) et demander à " +
      "l'utilisateur de renseigner la vraie valeur lui-même.\n",
  );
  process.exit(2);
}

let raw = "";
process.stdin.on("data", (chunk) => (raw += chunk));
process.stdin.on("end", () => {
  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    process.exit(0);
  }
  const tool = event?.tool_name;
  const input = event?.tool_input ?? {};

  if (tool === "Bash") {
    const found = secretsInCommand(input.command ?? "");
    if (found.length) deny(`la commande touche un fichier secret (${found.join(", ")}).`);
    if (VERCEL_TOKEN_DIR.test(input.command ?? "")) {
      deny("la commande touche le jeton de connexion de l'outil Vercel.");
    }
    if (vercelSecretCommand(input.command ?? "")) {
      deny(
        "« vercel env pull », « vercel pull » et « vercel env run » recopient les " +
          "variables d'environnement du site (clés) en clair. Pour vérifier une " +
          "variable, utiliser « vercel env ls », qui n'affiche que les noms.",
      );
    }
    process.exit(0);
  }

  for (const target of targetsOf(tool, input)) {
    if (!target) continue;
    if (VERCEL_TOKEN_DIR.test(String(target))) {
      deny(`${tool} sur le jeton de connexion de l'outil Vercel (${target}).`);
    }
    // Un motif Glob/Grep comme "**/.env*" vise aussi des secrets
    const name = basename(String(target));
    if (ALLOWED_FILE.test(name)) continue;
    if (isSecretFile(target) || /^\*?\.env/i.test(name)) {
      deny(`${tool} sur un fichier secret (${target}).`);
    }
  }
  process.exit(0);
});

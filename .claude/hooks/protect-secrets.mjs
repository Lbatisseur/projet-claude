#!/usr/bin/env node
// Hook PreToolUse : interdit à l'agent de lire, écrire ou afficher un fichier secret
// (.env, .env.local, clés .pem/.key…), quel que soit l'outil utilisé.
// Seul le modèle documenté .env.example reste accessible.
//
// Code de sortie 2 = action refusée (le message sur stderr est renvoyé à l'agent).
// Toute erreur interne laisse passer (code 0) : un garde-fou ne doit jamais
// bloquer la session par accident.

import { basename } from "node:path";

// Nom de fichier secret : .env, .env.local, .env.production…, *.pem, *.key
const SECRET_FILE = /^(\.env(\..+)?|.+\.(pem|key))$/;
const ALLOWED_FILE = /^\.env\.(example|sample|template)$/;

// Dans une commande shell : un mot qui désigne un fichier .env ou une clé
const SECRET_IN_COMMAND =
  /(^|[\s"'=<>|;&(/])(\.env(\.[\w.-]+)?|[\w.-]+\.(pem|key))(?=$|[\s"'<>|;&)])/g;

function isSecretFile(path) {
  const name = basename(String(path));
  return SECRET_FILE.test(name) && !ALLOWED_FILE.test(name);
}

function secretsInCommand(command) {
  const found = [];
  for (const match of String(command).matchAll(SECRET_IN_COMMAND)) {
    const word = match[2];
    if (isSecretFile(word)) found.push(word);
  }
  return found;
}

// Chemins et motifs touchés par l'appel d'outil
function targetsOf(tool, input) {
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
    process.exit(0);
  }

  for (const target of targetsOf(tool, input)) {
    if (!target) continue;
    // Un motif Glob/Grep comme "**/.env*" vise aussi des secrets
    const name = basename(String(target));
    if (ALLOWED_FILE.test(name)) continue;
    if (isSecretFile(target) || /^\*?\.env/.test(name)) {
      deny(`${tool} sur un fichier secret (${target}).`);
    }
  }
  process.exit(0);
});

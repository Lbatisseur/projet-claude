// Tests de la configuration MCP : node --test tests/
// Ils protègent les réglages de sécurité du navigateur contre une modification
// involontaire (voir docs/mcp.md).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { ROOT } from "../hooks/helpers.mjs";

const mcp = JSON.parse(readFileSync(`${ROOT}.mcp.json`, "utf8"));
const settings = JSON.parse(readFileSync(`${ROOT}.claude/settings.json`, "utf8"));
const playwright = mcp.mcpServers.playwright;

describe("MCP navigateur (Playwright)", () => {
  test("version figée, jamais @latest", () => {
    const pkg = playwright.args.find((a) => a.startsWith("@playwright/mcp"));
    assert.match(pkg, /^@playwright\/mcp@\d+\.\d+\.\d+$/);
  });

  test("profil isolé : ni cookies ni sessions conservés", () => {
    assert.ok(playwright.args.includes("--isolated"));
  });

  test("accès aux fichiers limité au projet, file:// bloqué", () => {
    assert.ok(!playwright.args.includes("--allow-unrestricted-file-access"));
  });

  test("fichiers produits (captures…) dans un dossier ignoré par git", () => {
    const dir = playwright.args[playwright.args.indexOf("--output-dir") + 1];
    assert.match(dir, /^\.claude\/state\//);
    assert.match(readFileSync(`${ROOT}.gitignore`, "utf8"), /^\/\.claude\/state\/$/m);
  });

  test("outil d'exécution de code arbitraire interdit", () => {
    assert.ok(settings.permissions.deny.includes("mcp__playwright__browser_run_code_unsafe"));
  });

  test("le hook de protection des secrets couvre les outils MCP", () => {
    const entry = settings.hooks.PreToolUse.find((h) =>
      h.hooks.some((x) => x.command.includes("protect-secrets")),
    );
    assert.ok(new RegExp(`^(${entry.matcher})$`).test("mcp__playwright__browser_file_upload"));
  });
});

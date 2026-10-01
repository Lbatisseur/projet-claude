// Tests de la configuration MCP : node --test tests/
// Ils protègent les réglages de sécurité des serveurs MCP contre une modification
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
});

describe("MCP Stripe", () => {
  const stripe = mcp.mcpServers.stripe;

  test("serveur officiel, en HTTPS", () => {
    assert.equal(stripe.type, "http");
    assert.equal(new URL(stripe.url).origin, "https://mcp.stripe.com");
  });

  test("connexion OAuth : aucune clé ni en-tête d'authentification dans le dépôt", () => {
    assert.equal(stripe.headers, undefined);
    assert.doesNotMatch(JSON.stringify(mcp), /sk_|rk_|Bearer|Authorization/i);
  });

  test("toute écriture dans Stripe demande l'accord de l'utilisateur", () => {
    assert.ok(settings.permissions.ask.includes("mcp__stripe__stripe_api_write"));
    // Joker : le connecteur Stripe de claude.ai s'appelle mcp__claude_ai_Stripe__…
    assert.ok(settings.permissions.ask.includes("mcp__*__stripe_api_write"));
    assert.ok(!settings.permissions.allow?.some((r) => /stripe/i.test(r)));
  });

  test("hook stripe-test-only actif sur tous les outils Stripe", () => {
    const entry = settings.hooks.PreToolUse.find((h) =>
      h.hooks.some((x) => x.command.includes("stripe-test-only")),
    );
    const matcher = new RegExp(`^(${entry.matcher})$`);
    for (const tool of [
      "mcp__stripe__stripe_api_write",
      "mcp__stripe__stripe_api_read",
      "mcp__claude_ai_Stripe__stripe_api_write",
      "mcp__STRIPE__stripe_api_read",
    ]) {
      assert.ok(matcher.test(tool), tool);
    }
  });

  test("envoi de messages à Stripe au nom du compte interdit", () => {
    assert.ok(settings.permissions.deny.includes("mcp__stripe__send_stripe_feedback"));
    assert.ok(settings.permissions.deny.includes("mcp__*__send_stripe_feedback"));
  });
});

describe("Garde-fous communs", () => {
  test("le hook de protection des secrets couvre les outils de tous les serveurs MCP", () => {
    const entry = settings.hooks.PreToolUse.find((h) =>
      h.hooks.some((x) => x.command.includes("protect-secrets")),
    );
    const matcher = new RegExp(`^(${entry.matcher})$`);
    for (const server of Object.keys(mcp.mcpServers)) {
      assert.ok(matcher.test(`mcp__${server}__outil`), server);
    }
  });
});

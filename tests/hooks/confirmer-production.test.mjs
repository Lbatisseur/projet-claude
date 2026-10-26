// Tests du hook confirmer-production : node --test tests/
// Le hook ne bloque pas : pour une action qui touche le site en ligne, il demande
// à Claude Code de faire confirmer l'utilisateur (permissionDecision « ask »).
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { runHook } from "./helpers.mjs";

const HOOK = ".claude/hooks/confirmer-production.mjs";

function decision(command, tool_name = "Bash") {
  const r = runHook(HOOK, { tool_name, tool_input: { command } });
  assert.equal(r.status, 0, `le hook ne doit jamais bloquer — ${r.stderr}`);
  if (!r.stdout.trim()) return null;
  const sortie = JSON.parse(r.stdout).hookSpecificOutput;
  assert.equal(sortie.hookEventName, "PreToolUse");
  assert.match(sortie.permissionDecisionReason, /en ligne|production/);
  return sortie.permissionDecision;
}

describe("confirmer-production : demande confirmation", () => {
  const cas = [
    "vercel deploy --prod",
    "vercel --prod",
    "npx vercel@65.2.0 deploy --prod --yes",
    "npx -y vercel deploy --prod",
    "cd sites/demo && vercel deploy --prod",
    "vercel deploy --cwd sites/demo --prod",
    "vercel deploy --target=production",
    "vercel deploy --target production",
    // Option apparue avec la version 65 de l'outil (équivalent de --prod)
    "vercel deploy --environment production",
    "vercel deploy --environment=production --yes",
    "vercel redeploy https://demo-abc.vercel.app --target production",
    "vercel promote https://demo-abc.vercel.app",
    "vercel rollback",
    "vercel remove demo-maison-lumen --yes",
    "vercel rm demo-maison-lumen",
    "vercel alias set demo-abc.vercel.app boutique.fr",
    "vercel domains add boutique.fr",
    "vercel dns add boutique.fr @ A 1.2.3.4",
    "vercel env add STRIPE_SECRET_KEY production",
    "vercel env rm STRIPE_SECRET_KEY production",
    "vercel env update SITE_URL production",
    "vercel project rm demo",
    "vc --prod",
    "VERCEL DEPLOY --PROD",
    "npm run build && vercel deploy --prod",
  ];
  for (const commande of cas) {
    test(commande, () => assert.equal(decision(commande), "ask"));
  }
});

describe("confirmer-production : laisse passer le reste sans question", () => {
  const cas = [
    "vercel deploy",
    "vercel deploy --yes",
    "vercel deploy --environment preview",
    "vercel link --yes --project demo-maison-lumen",
    "vercel env ls",
    "vercel ls",
    "vercel inspect https://demo-abc.vercel.app",
    "vercel whoami",
    "vercel --version",
    "npm run build",
    "git push",
    "echo production",
    "rm -rf build",
    "npm install --production",
    // Chaque morceau de la commande est jugé seul : --prod appartient à echo
    'vercel deploy; echo "déployé hors --prod"',
  ];
  for (const commande of cas) {
    test(commande, () => assert.equal(decision(commande), null));
  }
  test("un autre outil que Bash", () => assert.equal(decision("vercel deploy --prod", "Read"), null));
});

describe("confirmer-production : ne casse jamais la session", () => {
  for (const [nom, stdin] of [
    ["entrée vide", ""],
    ["JSON invalide", "{{{"],
    ["sans tool_input", '{"tool_name":"Bash"}'],
    ["null", "null"],
  ]) {
    test(nom, () => {
      const r = runHook(HOOK, stdin);
      assert.equal(r.status, 0);
      assert.equal(r.stdout.trim(), "");
    });
  }
});

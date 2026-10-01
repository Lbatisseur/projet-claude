#!/usr/bin/env node
// Hook PreToolUse : l'agent n'agit sur Stripe qu'en mode test.
//
// Chaque outil du serveur MCP Stripe qui cible un compte (stripe_context) précise
// son mode : livemode false = test, true = argent réel. Tout appel qui n'est pas
// explicitement en mode test est refusé, quels que soient les droits accordés à la
// connexion OAuth (un client peut un jour donner accès à son mode réel).
// Les actions réelles se font par un humain, dans le tableau de bord Stripe.
//
// Code de sortie 2 = action refusée (le message sur stderr est renvoyé à l'agent).
// Toute erreur interne laisse passer (code 0) : un garde-fou ne doit jamais
// bloquer la session par accident.

// Nom d'outil MCP : mcp__<serveur>__<outil> ; le serveur peut contenir des _ simples
const isStripeTool = (tool) => /stripe/i.test(tool.match(/^mcp__(.+?)__/)?.[1] ?? "");

let raw = "";
process.stdin.on("data", (chunk) => (raw += chunk));
process.stdin.on("end", () => {
  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    process.exit(0);
  }
  const tool = String(event?.tool_name ?? "");
  const input = event?.tool_input;
  // Tout serveur dont le nom contient « stripe » : celui de .mcp.json
  // (mcp__stripe__…), le connecteur de claude.ai (mcp__claude_ai_Stripe__…),
  // ou un second serveur ajouté plus tard sous un autre nom.
  if (!isStripeTool(tool) || !input || typeof input !== "object") {
    process.exit(0);
  }

  // Seul le booléen false vaut « mode test » ; un outil qui cible un compte
  // sans préciser le mode est refusé aussi.
  const targetsAccount = "stripe_context" in input || "livemode" in input;
  if (targetsAccount && input.livemode !== false) {
    process.stderr.write(
      `BLOQUÉ : ${tool} hors mode test (livemode: ${JSON.stringify(input.livemode)}).\n` +
        "L'agent n'agit sur Stripe qu'en mode test (livemode: false). Une action sur " +
        "l'argent réel se fait par un humain, dans le tableau de bord Stripe.\n",
    );
    process.exit(2);
  }
  process.exit(0);
});

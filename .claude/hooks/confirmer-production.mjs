#!/usr/bin/env node
// Hook PreToolUse : toute commande de l'outil Vercel qui touche un site en ligne
// (déploiement en production, retour arrière, suppression, domaine, variables
// d'environnement) demande la confirmation de l'utilisateur, même en mode auto.
//
// Ce hook ne bloque jamais : il répond « ask » à Claude Code, qui affiche alors une
// demande de confirmation. Une fausse alerte ne coûte qu'une question de trop ;
// un oubli publierait un site sans que l'utilisateur l'ait voulu.
//
// Toute erreur interne laisse passer sans question (code 0, rien sur stdout) :
// un garde-fou ne doit jamais bloquer la session par accident.

// Appel de l'outil Vercel (vercel, son alias vc, éventuellement via npx), suivi du
// reste du morceau de commande.
const VERCEL_CALL = /(^|[\s"'(`/])(vercel|vc)(@\S*)?(\s.*)?$/i;

// Dans ce reste : une option ou une sous-commande qui touche la production.
const PRODUCTION = new RegExp(
  "(^|\\s)(" +
    [
      "--prod(uction)?", // vercel deploy --prod, vercel --prod
      "--(target|environment)(=|\\s+)production", // vercel deploy --environment production
      "promote", // une version de test devient le site en ligne
      "rollback", // retour à une version précédente du site en ligne
      "remove",
      "rm", // suppression d'un projet ou d'un déploiement
      "alias", // adresse d'un déploiement
      "domains?",
      "dns", // nom de domaine
      "env\\s+(add|rm|remove|update)", // variables (clés Stripe…) du site
      "project\\s+(rm|remove)",
    ].join("|") +
    ")(?=$|[\\s\"')`])",
  "i",
);

function production(command) {
  return String(command)
    .split(/[;&|\n]/)
    .some((part) => {
      const appel = part.match(VERCEL_CALL);
      return appel !== null && PRODUCTION.test(appel[4] ?? "");
    });
}

let raw = "";
process.stdin.on("data", (chunk) => (raw += chunk));
process.stdin.on("end", () => {
  try {
    const event = JSON.parse(raw);
    if (event?.tool_name !== "Bash" || !production(event?.tool_input?.command ?? "")) {
      process.exit(0);
    }
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "ask",
          permissionDecisionReason:
            "Cette commande Vercel touche un site en ligne (production, domaine, " +
            "variables ou suppression) : elle attend ta confirmation.",
        },
      }),
    );
  } catch {
    // Entrée illisible : on laisse passer sans question
  }
  process.exit(0);
});

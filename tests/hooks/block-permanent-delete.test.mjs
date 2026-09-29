// Tests du hook block-permanent-delete : node --test "tests/**/*.test.mjs"
// Les commandes ne sont jamais exécutées : elles sont seulement soumises au hook.
import { describe, test } from "node:test";
import { runHook } from "./helpers.mjs";

const HOOK = ".claude/hooks/block-permanent-delete.sh";
const run = (command) => runHook(HOOK, { tool_name: "Bash", tool_input: { command } });

describe("block-permanent-delete : bloque les suppressions définitives", () => {
  const commandes = [
    // rm et apparentés
    "rm fichier", "/bin/rm fichier", "\\rm fichier", "command rm fichier", "sudo rm -rf dossier",
    "cd src && rm a.ts", "ls; rm a", "xargs rm < liste", 'find . -name "*.log" -delete',
    "find . -exec rm {} \\;", "git rm fichier", "rmdir dossier", "unlink fichier", "shred -u f", "srm f",
    'bash -c "rm f"', 'eval "rm f"',
    // autres langages
    "perl -e 'unlink \"f\"'", "python3 -c \"import os; os.remove('f')\"",
    "python3 -c \"import shutil; shutil.rmtree('d')\"",
    "python3 -c \"from pathlib import Path; Path('f').unlink()\"",
    "node -e \"require('fs').rmSync('d',{recursive:true})\"", "node -e \"fs.unlinkSync('f')\"",
    // git destructif
    "git clean -fdx", "git clean -n", "git reset --hard", "git reset --hard HEAD~1", "git reset -q --hard",
    "git checkout -- .", "git checkout HEAD -- src/a.ts", "git restore .", "git restore src/a.ts",
    "cd site && git reset --hard",
    // divers
    "rsync -a --delete src/ dst/", "truncate -s 0 fichier",
  ];
  for (const c of commandes) test(c, () => run(c).assertBlocked());
});

describe("block-permanent-delete : laisse passer les commandes légitimes", () => {
  const commandes = [
    "ls -la", "npm run lint", "npm run format", "npm run build", "prettier --write .", "mkdir -p src/lib",
    "osascript -e 'tell application \"Finder\" to delete POSIX file \"/tmp/x\"'",
    'git commit -m "docs: explique pourquoi on évite rm"', 'grep -rn "rm" src', 'echo "confirm"',
    "cat firmware.txt", "npm install --save-dev @types/react-dom",
    "git checkout main", "git checkout -b feature/panier", "git restore --staged src/a.ts",
    "git reset --soft HEAD~1", "git reset HEAD src/a.ts", "git stash", "git status",
    'git commit -m "chore: clean up imports"', "rsync -a src/ dst/",
    "echo '<p className=\"truncate\">Nom</p>' >> page.tsx", "mv ancien.ts nouveau.ts",
  ];
  for (const c of commandes) test(c, () => run(c).assertAllowed());
});

// Limites assumées et documentées dans docs/hooks.md : ces commandes passent.
// Si l'une d'elles devient bloquée, mettre à jour la documentation.
describe("block-permanent-delete : limites connues (passent volontairement)", () => {
  const commandes = [
    'r""m fichier', "$(echo rm) fichier", // camouflage volontaire
    "cat /dev/null > fichier", "echo x > fichier", // réécriture par redirection
    "git -C site clean -fd", // option git avant la sous-commande
  ];
  for (const c of commandes) test(c, () => run(c).assertAllowed());
});

describe("block-permanent-delete : ne casse jamais la session", () => {
  for (const [nom, stdin] of [["entrée vide", ""], ["JSON invalide", "{{{"], ["sans commande", '{"tool_name":"Bash","tool_input":{}}']]) {
    test(nom, () => runHook(HOOK, stdin).assertAllowed());
  }
});

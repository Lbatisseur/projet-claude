// Tests du hook protect-secrets : node --test tests/
import { describe, test } from "node:test";
import { runHook } from "./helpers.mjs";

const HOOK = ".claude/hooks/protect-secrets.mjs";
const run = (tool_name, tool_input) => runHook(HOOK, { tool_name, tool_input });

describe("protect-secrets : bloque l'accès aux secrets", () => {
  const cas = [
    ["Read", { file_path: "/site/.env" }],
    ["Read", { file_path: "/site/.env.local" }],
    ["Read", { file_path: "/site/.env.production.local" }],
    ["Read", { file_path: "sites/demo/.env.development" }],
    ["Read", { file_path: "/site/certificats/stripe.pem" }],
    ["Read", { file_path: "/site/prive.key" }],
    ["Write", { file_path: "/site/.env.local", content: "STRIPE_SECRET_KEY=sk_live_x" }],
    ["Edit", { file_path: "/site/.env", old_string: "a", new_string: "b" }],
    ["MultiEdit", { file_path: "/site/.env", edits: [] }],
    ["Grep", { pattern: "STRIPE", path: "/site/.env.local" }],
    ["Grep", { pattern: "STRIPE", glob: ".env*" }],
    ["Glob", { pattern: "**/.env*" }],
    ["Glob", { pattern: "**/*.env" }],
    ["Bash", { command: "cat .env" }],
    ["Bash", { command: "cat sites/demo/.env.local" }],
    ["Bash", { command: "source .env && npm run dev" }],
    ["Bash", { command: "cp .env.example .env.local" }],
    ["Bash", { command: 'echo "STRIPE_SECRET_KEY=sk" >> .env.local' }],
    ["Bash", { command: "grep STRIPE .env.production" }],
    ["Bash", { command: "less ./.env" }],
    ["Bash", { command: "head -n 3 '.env'" }],
    ["Bash", { command: "export $(cat .env | xargs)" }],
    ["Bash", { command: "openssl rsa -in prive.key -text" }],
  ];
  for (const [tool, input] of cas) {
    test(`${tool} ${JSON.stringify(input)}`, () => run(tool, input).assertBlocked());
  }
});

describe("protect-secrets : laisse passer le reste", () => {
  const cas = [
    ["Read", { file_path: "/site/.env.example" }],
    ["Write", { file_path: "/site/.env.example", content: "# STRIPE_SECRET_KEY=" }],
    ["Read", { file_path: "/site/src/app/page.tsx" }],
    ["Read", { file_path: "/site/src/lib/environment.ts" }],
    ["Read", { file_path: "/site/src/lib/env.ts" }],
    ["Read", { file_path: "/site/keyboard.tsx" }],
    ["Grep", { pattern: "process.env", path: "/site/src" }],
    ["Grep", { pattern: "x", glob: "*.ts" }],
    ["Glob", { pattern: "**/.env.example" }],
    ["Glob", { pattern: "src/**/*.tsx" }],
    ["Bash", { command: "cat .env.example" }],
    ["Bash", { command: "npm run build" }],
    ["Bash", { command: "echo $NODE_ENV" }],
    ["Bash", { command: "grep -rn process.env src" }],
    ["Bash", { command: "ls -la" }],
    ["Bash", { command: "git add .gitignore .env.example" }],
    ["Bash", { command: "node --env-file-if-exists=x -v" }],
    ["WebFetch", { url: "https://example.com/.env" }],
  ];
  for (const [tool, input] of cas) {
    test(`${tool} ${JSON.stringify(input)}`, () => run(tool, input).assertAllowed());
  }
});

// Contournements trouvés par la campagne d'attaque du 2026-09-30.
// Le disque d'un Mac ignore la casse : .ENV ouvre .env.
describe("protect-secrets : bloque les contournements (casse, jokers, ponctuation)", () => {
  const cas = [
    ["Read", { file_path: "/site/.ENV" }],
    ["Read", { file_path: "/site/.Env.Local" }],
    ["Read", { file_path: "/site/cles/PRIVE.KEY" }],
    ["Bash", { command: "cat .ENV.LOCAL" }],
    ["mcp__playwright__browser_file_upload", { paths: ["/site/.ENV"] }],
    ["Bash", { command: "cat .env*" }],
    ["Bash", { command: "cat .env.loca?" }],
    ["Bash", { command: "echo `cat .env`" }],
    ["Bash", { command: "cat {.env,x}" }],
    ["Bash", { command: "cat .env," }],
    ["Bash", { command: "git show HEAD:.env" }],
    ["Read", { file_path: "/projet/.envrc" }],
    ["Bash", { command: "cat .envrc" }],
    ["Read", { file_path: "/home/.netrc" }],
    ["Read", { file_path: "/home/.ssh/id_ed25519" }],
    ["Bash", { command: "cat ~/.ssh/id_rsa" }],
    ["Read", { file_path: "/site/certificat.p12" }],
    ["Read", { file_path: "/site/certificat.PFX" }],
  ];
  for (const [tool, input] of cas) {
    test(`${tool} ${JSON.stringify(input)}`, () => run(tool, input).assertBlocked());
  }
});

describe("protect-secrets : pas de faux positif avec les motifs élargis", () => {
  const cas = [
    ["Read", { file_path: "/site/.ENV.EXAMPLE" }],
    ["Read", { file_path: "/home/.ssh/id_ed25519.pub" }],
    ["Read", { file_path: "/site/src/environment.ts" }],
    ["Bash", { command: "cat .env.example" }],
    ["Bash", { command: "git show HEAD:src/app/page.tsx" }],
    ["Bash", { command: "echo {a,b}.ts `date`" }],
    ["Bash", { command: "ls *.ts" }],
    ["Bash", { command: "cat .environment.ts" }],
    ["Bash", { command: 'node -e "console.log(process.env.NODE_ENV)"' }],
    ["Bash", { command: "npx next build --env production" }],
  ];
  for (const [tool, input] of cas) {
    test(`${tool} ${JSON.stringify(input)}`, () => run(tool, input).assertAllowed());
  }
});

// Outils MCP : un navigateur peut envoyer un fichier du projet dans une page,
// puis le lire en JavaScript, ou enregistrer une capture sous n'importe quel nom.
const PW = "mcp__playwright__";

describe("protect-secrets : bloque les secrets via les outils MCP", () => {
  const cas = [
    [`${PW}browser_file_upload`, { paths: ["/site/.env.local"] }],
    [`${PW}browser_file_upload`, { paths: ["/site/public/photo.png", "sites/demo/.env"] }],
    [`${PW}browser_file_upload`, { paths: ["/site/certificats/stripe.pem"] }],
    [`${PW}browser_drop`, { element: "zone", target: "e3", paths: ["/site/.env.production"] }],
    [`${PW}browser_take_screenshot`, { type: "png", filename: ".env" }],
    [`${PW}browser_console_messages`, { level: "error", filename: "sites/demo/.env.local" }],
    [`${PW}browser_evaluate`, { function: "() => 1", filename: "/site/.env" }],
    [`${PW}browser_navigate`, { url: "file:///site/.env.local" }],
    [`${PW}browser_navigate`, { url: "file:///site/%2Eenv" }],
    [`${PW}browser_navigate`, { url: "file:///site/prive.key?x=1#fin" }],
    [`${PW}browser_tabs`, { action: "new", url: "file:///site/.env" }],
    ["mcp__filesystem__read_file", { path: "/site/.env" }],
    ["mcp__autre__lire", { options: { file_path: "sites/demo/.env.local" } }],
  ];
  for (const [tool, input] of cas) {
    test(`${tool} ${JSON.stringify(input)}`, () => run(tool, input).assertBlocked());
  }
});

describe("protect-secrets : laisse passer l'usage normal des outils MCP", () => {
  const cas = [
    [`${PW}browser_navigate`, { url: "http://localhost:3000/panier" }],
    [`${PW}browser_navigate`, { url: "https://example.com/.env" }],
    [`${PW}browser_file_upload`, { paths: ["/site/public/photo.png"] }],
    [`${PW}browser_file_upload`, { paths: ["/site/.env.example"] }],
    [`${PW}browser_file_upload`, {}],
    [`${PW}browser_take_screenshot`, { type: "png", filename: "accueil-mobile.png" }],
    [`${PW}browser_type`, { element: "champ", target: "e5", text: "mon fichier .env" }],
    [`${PW}browser_snapshot`, {}],
    ["mcp__claude_ai_Claude_Docs__batch", { batch: [{ markdown: "Copier .env.example en .env.local" }] }],
  ];
  for (const [tool, input] of cas) {
    test(`${tool} ${JSON.stringify(input)}`, () => run(tool, input).assertAllowed());
  }
});

describe("protect-secrets : ne casse jamais la session", () => {
  for (const [nom, stdin] of [
    ["entrée vide", ""],
    ["JSON invalide", "{{{"],
    ["sans tool_input", '{"tool_name":"Read"}'],
    ["null", "null"],
  ]) {
    test(nom, () => runHook(HOOK, stdin).assertAllowed());
  }
});

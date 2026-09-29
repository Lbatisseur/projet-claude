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

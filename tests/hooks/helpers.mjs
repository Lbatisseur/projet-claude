import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const ROOT = fileURLToPath(new URL("../../", import.meta.url));

/**
 * Exécute un hook comme le ferait Claude Code : l'événement JSON arrive sur stdin.
 * `event` peut être un objet (sérialisé en JSON) ou une chaîne brute.
 */
export function runHook(hook, event, { env = {}, cwd = ROOT } = {}) {
  const input = typeof event === "string" ? event : JSON.stringify(event);
  const result = spawnSync(`${ROOT}${hook}`, [], {
    input,
    cwd,
    encoding: "utf8",
    env: { ...process.env, CLAUDE_PROJECT_DIR: ROOT.replace(/\/$/, ""), ...env },
  });
  const describe = () => `code ${result.status}\nstderr: ${result.stderr}\nstdout: ${result.stdout}`;
  return {
    ...result,
    assertBlocked() {
      assert.equal(result.status, 2, `devait être bloqué — ${describe()}`);
      assert.match(result.stderr, /BLOQUÉ/);
    },
    assertAllowed() {
      assert.equal(result.status, 0, `devait passer — ${describe()}`);
    },
  };
}

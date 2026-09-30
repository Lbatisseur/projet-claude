// Tests du hook stripe-test-only : node --test tests/
import { describe, test } from "node:test";
import { runHook } from "./helpers.mjs";

const HOOK = ".claude/hooks/stripe-test-only.mjs";
const run = (tool_name, tool_input) => runHook(HOOK, { tool_name, tool_input });
const CTX = "acct_1Test";

describe("stripe-test-only : bloque tout appel hors mode test", () => {
  const cas = [
    ["mcp__stripe__stripe_api_read", { stripe_api_operation_id: "GetBalance", stripe_context: CTX, livemode: true, parameters: {} }],
    ["mcp__stripe__stripe_api_write", { stripe_api_operation_id: "PostRefunds", stripe_context: CTX, livemode: true, parameters: { charge: "ch_1" } }],
    ["mcp__stripe__stripe_api_search", { intent: "list", resource: "payouts", stripe_context: CTX, livemode: true }],
    ["mcp__stripe__stripe_analytics", { intent: "execute_query_run", stripe_context: CTX, livemode: true, params: {} }],
    // Valeur ambiguë : seul le booléen false est accepté
    ["mcp__stripe__stripe_api_read", { stripe_api_operation_id: "GetBalance", stripe_context: CTX, livemode: "false" }],
    ["mcp__stripe__stripe_api_read", { stripe_api_operation_id: "GetBalance", stripe_context: CTX, livemode: 0 }],
    ["mcp__stripe__stripe_api_read", { stripe_api_operation_id: "GetBalance", stripe_context: CTX, livemode: null }],
    // Compte ciblé sans mode précisé
    ["mcp__stripe__stripe_api_write", { stripe_api_operation_id: "PostProducts", stripe_context: CTX, parameters: {} }],
    // Un outil futur qui ciblerait un compte suit la même règle
    ["mcp__stripe__outil_futur", { stripe_context: CTX, livemode: true }],
  ];
  for (const [tool, input] of cas) {
    test(`${tool} ${JSON.stringify(input)}`, () => run(tool, input).assertBlocked());
  }
});

describe("stripe-test-only : laisse passer le mode test et le reste", () => {
  const cas = [
    ["mcp__stripe__stripe_api_read", { stripe_api_operation_id: "GetProducts", stripe_context: CTX, livemode: false, parameters: {} }],
    ["mcp__stripe__stripe_api_write", { stripe_api_operation_id: "PostProducts", stripe_context: CTX, livemode: false, parameters: { name: "livemode: true" } }],
    ["mcp__stripe__stripe_analytics", { intent: "search_query_tables", stripe_context: CTX, livemode: false, params: {} }],
    // Outils qui ne ciblent aucun compte
    ["mcp__stripe__list_available_accounts_or_orgs", {}],
    ["mcp__stripe__manage_stripe_accounts", {}],
    ["mcp__stripe__search_stripe_documentation", { question: "Checkout livemode", language: "fr" }],
    // Autres outils : pas concernés
    ["mcp__playwright__browser_navigate", { url: "http://localhost:3000", livemode: true }],
    ["Bash", { command: "npm run build" }],
  ];
  for (const [tool, input] of cas) {
    test(`${tool} ${JSON.stringify(input)}`, () => run(tool, input).assertAllowed());
  }
});

describe("stripe-test-only : ne casse jamais la session", () => {
  for (const [nom, stdin] of [
    ["entrée vide", ""],
    ["JSON invalide", "{{{"],
    ["sans tool_input", '{"tool_name":"mcp__stripe__stripe_api_read"}'],
    ["null", "null"],
  ]) {
    test(nom, () => runHook(HOOK, stdin).assertAllowed());
  }
});

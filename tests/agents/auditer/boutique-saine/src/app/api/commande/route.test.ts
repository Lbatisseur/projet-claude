import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

/** Remplace l'appel réseau à Stripe et garde ce qui lui a été envoyé. */
function simulerStripe() {
  const appel = vi.fn<typeof fetch>(async () =>
    Response.json({ url: "https://checkout.stripe.com/c/pay/test" }),
  );
  vi.stubGlobal("fetch", appel);
  return appel;
}

function commander(corps: unknown) {
  return POST(
    new Request("http://localhost/api/commande", {
      method: "POST",
      body: JSON.stringify(corps),
    }),
  );
}

beforeEach(() => {
  vi.stubEnv("STRIPE_SECRET_KEY", "cle-factice-de-test");
  vi.stubEnv("SITE_URL", "https://savonnerie-ondine.fr");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("POST /api/commande", () => {
  it("demande à Stripe le paiement par carte seule, au prix du catalogue", async () => {
    const appel = simulerStripe();
    const reponse = await commander({
      articles: [{ slug: "lavande", quantite: 2, prix: 1 }],
    });

    expect(reponse.status).toBe(200);
    const envoye = new URLSearchParams(String(appel.mock.calls[0][1]?.body));
    expect(envoye.getAll("payment_method_types[0]")).toEqual(["card"]);
    expect(envoye.get("payment_method_types[1]")).toBeNull();
    expect(envoye.get("line_items[0][price_data][unit_amount]")).toBe("800");
    expect(envoye.get("line_items[0][quantity]")).toBe("2");
    expect(envoye.get("success_url")).toBe(
      "https://savonnerie-ondine.fr/merci",
    );
  });

  it("refuse une commande invalide sans appeler Stripe", async () => {
    const appel = simulerStripe();
    const reponse = await commander({
      articles: [{ slug: "lavande", quantite: 1.1 }],
    });
    expect(reponse.status).toBe(400);
    expect(appel).not.toHaveBeenCalled();
  });

  it("répond 503 sans clé Stripe", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    const appel = simulerStripe();
    const reponse = await commander({
      articles: [{ slug: "lavande", quantite: 1 }],
    });
    expect(reponse.status).toBe(503);
    expect(appel).not.toHaveBeenCalled();
  });
});

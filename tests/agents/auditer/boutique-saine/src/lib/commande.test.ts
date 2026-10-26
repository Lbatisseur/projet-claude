import { describe, expect, it } from "vitest";
import { preparerCommande, totalCommande } from "./commande";

describe("preparerCommande", () => {
  it("relit le nom et le prix dans le catalogue, jamais dans la requête", () => {
    const commande = preparerCommande({
      articles: [{ slug: "lavande", quantite: 2, prix: 1, nom: "Cadeau" }],
    });
    expect(commande).toEqual({
      ok: true,
      lignes: [{ nom: "Savon à la lavande", prix: 800, quantite: 2 }],
      livraison: 490,
    });
  });

  it("offre la livraison dès 40 € et l'inclut dans le total", () => {
    const commande = preparerCommande({
      articles: [
        { slug: "argile-verte", quantite: 1 },
        { slug: "coffret-decouverte", quantite: 1 },
      ],
    });
    expect(commande.ok && commande.livraison).toBe(0);
    if (commande.ok) {
      expect(totalCommande(commande.lignes, commande.livraison)).toBe(4000);
    }
  });

  it.each([
    ["corps absent", null],
    ["articles absent", {}],
    ["panier vide", { articles: [] }],
    ["produit inconnu", { articles: [{ slug: "inconnu", quantite: 1 }] }],
    ["produit épuisé", { articles: [{ slug: "charbon", quantite: 1 }] }],
    ["plus que le stock", { articles: [{ slug: "rose", quantite: 7 }] }],
    ["quantité décimale", { articles: [{ slug: "lavande", quantite: 1.5 }] }],
    ["quantité nulle", { articles: [{ slug: "lavande", quantite: 0 }] }],
    ["quantité négative", { articles: [{ slug: "lavande", quantite: -2 }] }],
    ["quantité en texte", { articles: [{ slug: "lavande", quantite: "2" }] }],
    [
      "même produit sur deux lignes",
      {
        articles: [
          { slug: "rose", quantite: 6 },
          { slug: "rose", quantite: 6 },
        ],
      },
    ],
  ])("refuse : %s", (_cas, corps) => {
    expect(preparerCommande(corps).ok).toBe(false);
  });
});

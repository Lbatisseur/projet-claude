import { describe, expect, it } from "vitest";
import { fraisDeLivraison, prixDeLigne, sousTotal } from "./panier";

describe("panier", () => {
  it("multiplie le prix par la quantité", () => {
    expect(prixDeLigne({ prix: 800, quantite: 3 })).toBe(2400);
  });

  it("additionne les lignes", () => {
    expect(
      sousTotal([
        { prix: 800, quantite: 1 },
        { prix: 1200, quantite: 1 },
      ]),
    ).toBe(2000);
  });

  it("facture la livraison sous le seuil et l'offre au-dessus", () => {
    expect(fraisDeLivraison(3000)).toBe(490);
    expect(fraisDeLivraison(5000)).toBe(0);
  });
});

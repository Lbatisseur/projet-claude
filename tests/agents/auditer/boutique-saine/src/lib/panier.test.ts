import { describe, expect, it } from "vitest";
import {
  bornerQuantite,
  fraisDeLivraison,
  prixDeLigne,
  quantiteMaximale,
  sousTotal,
} from "./panier";

describe("panier", () => {
  it("multiplie le prix par la quantité", () => {
    expect(prixDeLigne({ prix: 800, quantite: 3 })).toBe(2400);
  });

  it("additionne les lignes en tenant compte des quantités", () => {
    expect(
      sousTotal([
        { prix: 800, quantite: 3 },
        { prix: 1200, quantite: 1 },
      ]),
    ).toBe(3600);
  });

  it("facture la livraison sous le seuil et l'offre dès le seuil", () => {
    expect(fraisDeLivraison(3999)).toBe(490);
    expect(fraisDeLivraison(4000)).toBe(0);
    expect(fraisDeLivraison(5000)).toBe(0);
  });

  it("ne permet jamais de commander plus que le stock", () => {
    expect(quantiteMaximale(0)).toBe(0);
    expect(quantiteMaximale(6)).toBe(6);
    expect(quantiteMaximale(24)).toBe(10);
  });

  it("ramène toute saisie à un entier entre 1 et le maximum", () => {
    expect(bornerQuantite("3", 10)).toBe(3);
    expect(bornerQuantite("1.1", 10)).toBe(1);
    expect(bornerQuantite(2.5, 10)).toBe(2);
    expect(bornerQuantite("50", 6)).toBe(6);
    expect(bornerQuantite("-4", 10)).toBe(1);
    expect(bornerQuantite("", 10)).toBe(1);
    expect(bornerQuantite("abc", 10)).toBe(1);
  });
});

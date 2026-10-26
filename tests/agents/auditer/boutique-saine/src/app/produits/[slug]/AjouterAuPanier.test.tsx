// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { trouverProduit } from "@/lib/catalogue";
import { viderPanier } from "@/lib/memoire-panier";
import { AjouterAuPanier } from "./AjouterAuPanier";

beforeEach(viderPanier);
afterEach(cleanup);

/** Ce que le site a réellement enregistré dans le navigateur. */
function panierEnregistre(): unknown {
  return JSON.parse(localStorage.getItem("panier") ?? "[]");
}

function afficher(slug: string) {
  const stock = trouverProduit(slug)?.stock ?? 0;
  render(<AjouterAuPanier slug={slug} stock={stock} />);
  return {
    utilisateur: userEvent.setup(),
    champ: screen.getByLabelText("Quantité"),
    bouton: screen.getByRole("button", { name: "Ajouter au panier" }),
  };
}

describe("AjouterAuPanier", () => {
  it("laisse effacer le 1 puis taper une autre quantité", async () => {
    const { utilisateur, champ, bouton } = afficher("lavande");
    await utilisateur.type(champ, "{Backspace}5");
    expect(champ).toHaveProperty("value", "5");
    await utilisateur.click(bouton);
    expect(panierEnregistre()).toEqual([{ slug: "lavande", quantite: 5 }]);
  });

  it("n'ajoute jamais une quantité décimale", async () => {
    const { utilisateur, champ, bouton } = afficher("lavande");
    await utilisateur.clear(champ);
    await utilisateur.type(champ, "1.1");
    await utilisateur.click(bouton);
    expect(panierEnregistre()).toEqual([{ slug: "lavande", quantite: 1 }]);
    expect(champ).toHaveProperty("value", "1");
  });

  it("ramène la saisie au stock en quittant le champ", async () => {
    // Le coffret découverte n'a que 5 exemplaires en stock.
    const { utilisateur, champ, bouton } = afficher("coffret-decouverte");
    await utilisateur.clear(champ);
    await utilisateur.type(champ, "9");
    await utilisateur.tab();
    expect(champ).toHaveProperty("value", "5");
    await utilisateur.click(bouton);
    expect(panierEnregistre()).toEqual([
      { slug: "coffret-decouverte", quantite: 5 },
    ]);
  });

  it("ajoute 1 exemplaire si le champ est laissé vide", async () => {
    const { utilisateur, champ, bouton } = afficher("lavande");
    await utilisateur.clear(champ);
    await utilisateur.click(bouton);
    expect(panierEnregistre()).toEqual([{ slug: "lavande", quantite: 1 }]);
  });
});

import type { Metadata } from "next";
import { Panier } from "./Panier";

export const metadata: Metadata = { title: "Panier" };

export default function PagePanier() {
  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold">Votre panier</h1>
      <Panier />
    </>
  );
}

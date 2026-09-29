"use client";

import { formaterPrix } from "@/lib/prix";

export type LignePanier = {
  id: string;
  nom: string;
  prixCentimes: number;
  quantite: number;
};

export function Panier({ lignes }: { lignes: LignePanier[] }) {
  const total = lignes.reduce((s, l) => s + l.prixCentimes * l.quantite, 0);

  async function payer() {
    const reponse = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lignes, retour: window.location.origin }),
    });
    const { url } = await reponse.json();
    window.location.href = url;
  }

  return (
    <section>
      <ul>
        {lignes.map((l) => (
          <li key={l.id}>
            {l.nom} × {l.quantite} — {formaterPrix(l.prixCentimes * l.quantite)}
          </li>
        ))}
      </ul>
      <p>Total : {formaterPrix(total)}</p>
      <button onClick={payer}>Payer</button>
    </section>
  );
}

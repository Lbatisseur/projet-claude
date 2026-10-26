"use client";

import { useState } from "react";
import { ajouterAuPanier } from "@/lib/memoire-panier";

export function AjouterAuPanier({ slug }: { slug: string }) {
  const [quantite, setQuantite] = useState(1);
  const [ajoute, setAjoute] = useState(false);

  return (
    <div className="mt-6 flex items-center gap-3">
      <label htmlFor="quantite">Quantité</label>
      <input
        id="quantite"
        type="number"
        min={1}
        max={10}
        value={quantite}
        onChange={(e) => setQuantite(Math.max(1, Number(e.target.value)))}
        className="w-16 rounded border border-zinc-300 px-2 py-1"
      />
      <button
        type="button"
        onClick={() => {
          ajouterAuPanier(slug, quantite);
          setAjoute(true);
        }}
        className="rounded bg-zinc-900 px-4 py-2 text-white"
      >
        Ajouter au panier
      </button>
      {ajoute && <span role="status">Ajouté !</span>}
    </div>
  );
}

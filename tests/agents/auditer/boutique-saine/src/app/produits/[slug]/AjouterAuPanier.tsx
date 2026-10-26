"use client";

import { useState } from "react";
import { ajouterAuPanier } from "@/lib/memoire-panier";
import { bornerQuantite, quantiteMaximale } from "@/lib/panier";

export function AjouterAuPanier({
  slug,
  stock,
}: {
  slug: string;
  stock: number;
}) {
  const max = quantiteMaximale(stock);
  // Le champ garde le texte tapé tel quel : le corriger à chaque frappe
  // empêcherait de l'effacer (un champ vide redeviendrait aussitôt « 1 »).
  // La quantité réelle n'est bornée qu'à partir de ce texte.
  const [saisie, setSaisie] = useState("1");
  const quantite = bornerQuantite(saisie, max);
  const [message, setMessage] = useState("");

  return (
    <div className="mt-6 flex flex-wrap items-center gap-3">
      <label htmlFor="quantite">Quantité</label>
      <input
        id="quantite"
        type="number"
        inputMode="numeric"
        min={1}
        max={max}
        step={1}
        value={saisie}
        onChange={(e) => setSaisie(e.target.value)}
        onBlur={() => setSaisie(String(quantite))}
        className="w-16 rounded border border-zinc-300 px-2 py-1"
      />
      <button
        type="button"
        onClick={() => {
          const ajoutes = ajouterAuPanier(slug, quantite);
          setSaisie(String(quantite));
          setMessage(
            ajoutes === 0
              ? "Quantité maximale déjà dans votre panier."
              : ajoutes < quantite
                ? `${ajoutes} ajouté(s) : quantité maximale atteinte.`
                : "Ajouté !",
          );
        }}
        className="rounded bg-zinc-900 px-4 py-2 text-white"
      >
        Ajouter au panier
      </button>
      {message && <span role="status">{message}</span>}
    </div>
  );
}

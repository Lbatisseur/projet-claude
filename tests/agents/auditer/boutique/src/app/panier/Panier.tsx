"use client";

import Link from "next/link";
import { useState } from "react";
import { trouverProduit } from "@/lib/catalogue";
import { changerQuantite, usePanier } from "@/lib/memoire-panier";
import { fraisDeLivraison, prixDeLigne, sousTotal } from "@/lib/panier";
import { formaterPrix } from "@/lib/prix";

export function Panier() {
  const panier = usePanier();
  const [code, setCode] = useState("");
  const [messageCode, setMessageCode] = useState("");
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);

  const lignes = panier.flatMap((l) => {
    const produit = trouverProduit(l.slug);
    return produit ? [{ ...produit, quantite: l.quantite }] : [];
  });

  if (lignes.length === 0) {
    return (
      <p>
        Votre panier est vide. <Link href="/">Découvrir nos savons</Link>
      </p>
    );
  }

  const montant = sousTotal(lignes);
  const livraison = fraisDeLivraison(montant);

  async function payer() {
    setEnvoi(true);
    setErreur("");
    const reponse = await fetch("/api/commande", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        articles: lignes.map((l) => ({
          nom: l.nom,
          prix: l.prix,
          quantite: l.quantite,
        })),
      }),
    });
    const resultat = (await reponse.json()) as {
      url?: string;
      erreur?: string;
    };
    if (resultat.url) {
      window.location.assign(resultat.url);
    } else {
      setErreur(resultat.erreur ?? "Le paiement a échoué.");
      setEnvoi(false);
    }
  }

  return (
    <div className="space-y-6">
      <ul className="divide-y divide-zinc-200">
        {lignes.map((l) => (
          <li
            key={l.slug}
            className="flex items-center justify-between gap-4 py-3"
          >
            <span>{l.nom}</span>
            <span className="flex items-center gap-2">
              <button
                type="button"
                aria-label={`Retirer un ${l.nom}`}
                onClick={() => changerQuantite(l.slug, l.quantite - 1)}
                className="rounded border px-2"
              >
                −
              </button>
              <span>{l.quantite}</span>
              <button
                type="button"
                aria-label={`Ajouter un ${l.nom}`}
                onClick={() => changerQuantite(l.slug, l.quantite + 1)}
                className="rounded border px-2"
              >
                +
              </button>
            </span>
            <span>{formaterPrix(prixDeLigne(l))}</span>
          </li>
        ))}
      </ul>

      <div className="flex gap-2">
        <label htmlFor="code" className="sr-only">
          Code promo
        </label>
        <input
          id="code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Code promo"
          className="rounded border border-zinc-300 px-2 py-1"
        />
        <button
          type="button"
          onClick={() => setMessageCode("Ce code n'est pas valide.")}
          className="rounded border px-3"
        >
          Appliquer
        </button>
        {messageCode && <span role="status">{messageCode}</span>}
      </div>

      <dl className="max-w-xs space-y-1">
        <div className="flex justify-between">
          <dt>Sous-total</dt>
          <dd>{formaterPrix(montant)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Livraison</dt>
          <dd>{livraison === 0 ? "Offerte" : formaterPrix(livraison)}</dd>
        </div>
        <div className="flex justify-between font-semibold">
          <dt>Total TTC</dt>
          <dd>{formaterPrix(montant + livraison)}</dd>
        </div>
      </dl>

      {erreur && (
        <p role="alert" className="text-red-700">
          {erreur}
        </p>
      )}
      <button
        type="button"
        disabled={envoi}
        onClick={payer}
        className="rounded bg-zinc-900 px-6 py-3 text-white disabled:opacity-50"
      >
        Valider le panier
      </button>
    </div>
  );
}

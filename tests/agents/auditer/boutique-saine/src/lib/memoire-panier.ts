"use client";

import { useSyncExternalStore } from "react";
import { trouverProduit } from "@/lib/catalogue";
import { quantiteMaximale } from "@/lib/panier";

/** Contenu du panier, conservé dans le navigateur (localStorage). */
export type LignePanier = { slug: string; quantite: number };

const CLE = "panier";
const VIDE: LignePanier[] = [];
const abonnes = new Set<() => void>();
let lignes: LignePanier[] | null = null;

/** Plafond d'un produit : son stock, dans la limite par commande. */
function plafond(slug: string): number {
  return quantiteMaximale(trouverProduit(slug)?.stock ?? 0);
}

/**
 * Le localStorage peut contenir n'importe quoi (ancienne version du site,
 * modification à la main) : on ne garde que les lignes valides, pour qu'un
 * panier abîmé ne puisse pas casser la page.
 */
function nettoyer(brut: unknown): LignePanier[] {
  if (!Array.isArray(brut)) return [];
  return brut.flatMap((ligne: unknown) => {
    if (typeof ligne !== "object" || ligne === null) return [];
    const { slug, quantite } = ligne as Record<string, unknown>;
    if (typeof slug !== "string" || !Number.isInteger(quantite)) return [];
    const max = plafond(slug);
    const q = Math.min(quantite as number, max);
    return q >= 1 ? [{ slug, quantite: q }] : [];
  });
}

function lire(): LignePanier[] {
  if (lignes === null) {
    try {
      lignes = nettoyer(JSON.parse(localStorage.getItem(CLE) ?? "[]"));
    } catch {
      lignes = [];
    }
  }
  return lignes;
}

function ecrire(nouvelles: LignePanier[]) {
  lignes = nouvelles;
  try {
    localStorage.setItem(CLE, JSON.stringify(nouvelles));
  } catch {
    // Navigation privée ou stockage plein : le panier reste en mémoire.
  }
  abonnes.forEach((prevenir) => prevenir());
}

function abonner(prevenir: () => void) {
  abonnes.add(prevenir);
  return () => {
    abonnes.delete(prevenir);
  };
}

export function usePanier(): LignePanier[] {
  return useSyncExternalStore(abonner, lire, () => VIDE);
}

/** Ajoute des exemplaires sans dépasser le plafond ; renvoie le nombre ajouté. */
export function ajouterAuPanier(slug: string, quantite: number): number {
  const actuelles = lire();
  const existante = actuelles.find((l) => l.slug === slug);
  const avant = existante?.quantite ?? 0;
  const apres = Math.min(avant + quantite, plafond(slug));
  if (apres <= avant) return 0;
  ecrire(
    existante
      ? actuelles.map((l) => (l.slug === slug ? { ...l, quantite: apres } : l))
      : [...actuelles, { slug, quantite: apres }],
  );
  return apres - avant;
}

export function changerQuantite(slug: string, quantite: number) {
  const q = Math.min(Math.trunc(quantite), plafond(slug));
  ecrire(
    q <= 0
      ? lire().filter((l) => l.slug !== slug)
      : lire().map((l) => (l.slug === slug ? { ...l, quantite: q } : l)),
  );
}

export function viderPanier() {
  ecrire([]);
}

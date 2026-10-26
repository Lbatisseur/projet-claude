"use client";

import { useSyncExternalStore } from "react";

/** Contenu du panier, conservé dans le navigateur (localStorage). */
export type LignePanier = { slug: string; quantite: number };

const CLE = "panier";
const VIDE: LignePanier[] = [];
const abonnes = new Set<() => void>();
let lignes: LignePanier[] | null = null;

function lire(): LignePanier[] {
  if (lignes === null) {
    try {
      lignes = JSON.parse(localStorage.getItem(CLE) ?? "[]") as LignePanier[];
    } catch {
      lignes = [];
    }
  }
  return lignes;
}

function ecrire(nouvelles: LignePanier[]) {
  lignes = nouvelles;
  localStorage.setItem(CLE, JSON.stringify(nouvelles));
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

export function ajouterAuPanier(slug: string, quantite: number) {
  const actuelles = lire();
  const existante = actuelles.find((l) => l.slug === slug);
  ecrire(
    existante
      ? actuelles.map((l) =>
          l.slug === slug ? { ...l, quantite: l.quantite + quantite } : l,
        )
      : [...actuelles, { slug, quantite }],
  );
}

export function changerQuantite(slug: string, quantite: number) {
  ecrire(
    quantite <= 0
      ? lire().filter((l) => l.slug !== slug)
      : lire().map((l) => (l.slug === slug ? { ...l, quantite } : l)),
  );
}

export function viderPanier() {
  ecrire([]);
}

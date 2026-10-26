"use client";

import { useEffect } from "react";
import { viderPanier } from "@/lib/memoire-panier";

/** Vide le panier une fois arrivé sur la page de remerciement. */
export function ViderPanier() {
  useEffect(() => {
    viderPanier();
  }, []);
  return null;
}

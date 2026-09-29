"use client";

import { annulerCommande } from "./actions";

export function BoutonAnnuler({ id }: { id: string }) {
  return (
    <button onClick={() => annulerCommande(id)}>Annuler la commande</button>
  );
}

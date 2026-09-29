"use client";

import type { Utilisateur } from "@/lib/db";
import { mettreAJourProfil } from "./actions";

export function FormulaireProfil({ utilisateur }: { utilisateur: Utilisateur }) {
  return (
    <form action={mettreAJourProfil}>
      <label>
        Nom
        <input name="nom" defaultValue={utilisateur.nom} maxLength={80} />
      </label>
      <label>
        E-mail
        <input name="email" type="email" defaultValue={utilisateur.email} />
      </label>
      <button type="submit">Enregistrer</button>
    </form>
  );
}

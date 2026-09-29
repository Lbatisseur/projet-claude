import { notFound } from "next/navigation";
import { lireUtilisateur } from "@/lib/auth";
import { listerProduits } from "@/lib/db";
import { formaterPrix } from "@/lib/prix";
import { modifierPrix } from "./actions";

export default async function PageAdmin() {
  const utilisateur = await lireUtilisateur();
  if (utilisateur?.role !== "admin") notFound();

  const produits = await listerProduits("nom");

  return (
    <main>
      <h1>Administration des prix</h1>
      {produits.map((p) => (
        <form key={p.slug} action={modifierPrix}>
          <input type="hidden" name="slug" value={p.slug} />
          <span>
            {p.nom} ({formaterPrix(p.prix_centimes)})
          </span>
          <input name="prixCentimes" type="number" min={1} step={1} required />
          <button type="submit">Modifier</button>
        </form>
      ))}
    </main>
  );
}

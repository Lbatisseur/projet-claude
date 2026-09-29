"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";

export async function annulerCommande(id: string) {
  await sql`update commandes set statut = 'annulee' where id = ${id}`;
  revalidatePath(`/commande/${id}`);
}

export async function publierAvis(formData: FormData) {
  const slug = formData.get("slug") as string;
  const auteur = formData.get("auteur") as string;
  const texte = formData.get("texte") as string;
  await sql`
    insert into avis (produit_slug, auteur, texte)
    values (${slug}, ${auteur}, ${texte})`;
  revalidatePath(`/produits/${slug}`);
}

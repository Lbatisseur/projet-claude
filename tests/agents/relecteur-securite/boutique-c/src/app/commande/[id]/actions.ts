"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { sql } from "@/lib/db";
import { lireUtilisateur } from "@/lib/auth";

// La page n'affiche ce bouton qu'au propriétaire de la commande (lireCommandeDe).
export async function annulerCommande(id: unknown) {
  const utilisateur = await lireUtilisateur();
  if (!utilisateur) redirect("/connexion");

  const resultat = z.uuid().safeParse(id);
  if (!resultat.success) return;

  await sql`
    update commandes set statut = 'annulee'
    where id = ${resultat.data} and statut = 'en_attente'`;
  revalidatePath(`/commande/${resultat.data}`);
}

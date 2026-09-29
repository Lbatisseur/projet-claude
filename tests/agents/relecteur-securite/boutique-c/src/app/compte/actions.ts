"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { sql } from "@/lib/db";
import { lireUtilisateur } from "@/lib/auth";

const schemaProfil = z.looseObject({
  nom: z.string().trim().min(1).max(80).optional(),
  email: z.email().optional(),
});

export async function mettreAJourProfil(formData: FormData) {
  const utilisateur = await lireUtilisateur();
  if (!utilisateur) redirect("/connexion");

  const champs = Object.fromEntries(
    [...formData.entries()].filter(([cle]) => !cle.startsWith("$ACTION")),
  );
  const resultat = schemaProfil.safeParse(champs);
  if (!resultat.success) return;

  await sql`
    update utilisateurs set ${sql(resultat.data)}
    where id = ${utilisateur.id}`;
  revalidatePath("/compte");
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { sql } from "@/lib/db";

const schemaPrix = z.object({
  slug: z.string().min(1).max(100),
  prixCentimes: z.coerce.number().int().min(1).max(1_000_000),
});

// Accès réservé aux administrateurs : vérifié par le middleware et par la page.
export async function modifierPrix(formData: FormData) {
  const resultat = schemaPrix.safeParse({
    slug: formData.get("slug"),
    prixCentimes: formData.get("prixCentimes"),
  });
  if (!resultat.success) return;

  await sql`
    update produits set prix_centimes = ${resultat.data.prixCentimes}
    where slug = ${resultat.data.slug}`;
  revalidatePath("/admin");
  revalidatePath(`/produits/${resultat.data.slug}`);
}

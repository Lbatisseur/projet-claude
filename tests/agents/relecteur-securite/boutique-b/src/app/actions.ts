"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { sql, lireCommandeDe } from "@/lib/db";
import { lireUtilisateur } from "@/lib/auth";
import { stripe } from "@/lib/stripe";

// Une Server Action est une route publique : on revalide tout, même ce que
// l'interface semble garantir.

export async function annulerCommande(id: unknown) {
  const utilisateur = await lireUtilisateur();
  if (!utilisateur) redirect("/connexion");

  const resultat = z.uuid().safeParse(id);
  if (!resultat.success) return;

  const commande = await lireCommandeDe(resultat.data, utilisateur.id);
  if (!commande || commande.statut !== "en_attente") return;

  // Fermer d'abord la page de paiement Stripe. Si le client a déjà payé,
  // Stripe refuse de l'expirer : on n'annule pas, le webhook marquera la commande payée.
  if (commande.stripe_session_id) {
    const session = await stripe.checkout.sessions.retrieve(commande.stripe_session_id);
    if (session.status === "complete") return;
    if (session.status === "open") {
      try {
        await stripe.checkout.sessions.expire(session.id);
      } catch {
        return;
      }
    }
  }

  await sql`
    update commandes set statut = 'annulee'
    where id = ${resultat.data}
      and client_id = ${utilisateur.id}
      and statut = 'en_attente'`;
  revalidatePath(`/commande/${resultat.data}`);
}

const schemaAvis = z.object({
  slug: z.string().min(1).max(100),
  auteur: z.string().trim().min(1).max(50),
  texte: z.string().trim().min(1).max(2000),
});

export async function publierAvis(formData: FormData) {
  const utilisateur = await lireUtilisateur();
  if (!utilisateur) redirect("/connexion");

  const resultat = schemaAvis.safeParse(Object.fromEntries(formData));
  if (!resultat.success) return;
  const { slug, auteur, texte } = resultat.data;

  await sql`
    insert into avis (produit_slug, client_id, auteur, texte)
    values (${slug}, ${utilisateur.id}, ${auteur}, ${texte})`;
  revalidatePath(`/produits/${slug}`);
}

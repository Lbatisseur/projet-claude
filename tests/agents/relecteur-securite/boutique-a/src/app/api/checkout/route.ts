import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { sql } from "@/lib/db";
import { lireUtilisateur } from "@/lib/auth";
import type { LignePanier } from "@/components/Panier";

export async function POST(request: Request) {
  const utilisateur = await lireUtilisateur();
  if (!utilisateur) {
    return NextResponse.json({ erreur: "Non connecté" }, { status: 401 });
  }

  const { lignes, retour } = (await request.json()) as {
    lignes: LignePanier[];
    retour: string;
  };

  const total = lignes.reduce((s, l) => s + l.prixCentimes * l.quantite, 0);
  const [commande] = await sql<{ id: string }[]>`
    insert into commandes (client_id, email, statut, total_centimes)
    values (${utilisateur.id}, ${utilisateur.email}, 'en_attente', ${total})
    returning id`;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: utilisateur.email,
    line_items: lignes.map((l) => ({
      quantity: l.quantite,
      price_data: {
        currency: "eur",
        unit_amount: l.prixCentimes,
        product_data: { name: l.nom },
      },
    })),
    metadata: { commandeId: commande.id },
    success_url: `${retour}/commande/succes?commande=${commande.id}`,
    cancel_url: `${retour}/panier`,
  });

  return NextResponse.json({ url: session.url });
}

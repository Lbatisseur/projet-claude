import { NextResponse } from "next/server";
import { z } from "zod";
import { stripe } from "@/lib/stripe";
import { sql, lireProduits, enregistrerSessionStripe } from "@/lib/db";
import { lireUtilisateur } from "@/lib/auth";

const URL_SITE = process.env.NEXT_PUBLIC_SITE_URL!;

const schemaPanier = z.object({
  lignes: z
    .array(
      z.object({
        id: z.string().min(1).max(100),
        quantite: z.number().int().min(1).max(10),
      }),
    )
    .min(1)
    .max(50),
});

export async function POST(request: Request) {
  const utilisateur = await lireUtilisateur();
  if (!utilisateur) {
    return NextResponse.json({ erreur: "Non connecté" }, { status: 401 });
  }

  const resultat = schemaPanier.safeParse(await request.json().catch(() => null));
  if (!resultat.success) {
    return NextResponse.json({ erreur: "Panier invalide" }, { status: 400 });
  }
  const { lignes } = resultat.data;

  // Les prix viennent de la base, jamais du navigateur.
  const slugs = [...new Set(lignes.map((l) => l.id))];
  const produits = new Map(
    (await lireProduits(slugs)).map((p) => [p.slug, p]),
  );
  if (produits.size !== slugs.length) {
    return NextResponse.json({ erreur: "Produit inconnu" }, { status: 400 });
  }

  const articles = lignes.map((l) => ({ produit: produits.get(l.id)!, quantite: l.quantite }));
  const total = articles.reduce(
    (s, a) => s + a.produit.prix_centimes * a.quantite,
    0,
  );

  const [commande] = await sql<{ id: string }[]>`
    insert into commandes (client_id, email, statut, total_centimes)
    values (${utilisateur.id}, ${utilisateur.email}, 'en_attente', ${total})
    returning id`;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: utilisateur.email,
    line_items: articles.map((a) => ({
      quantity: a.quantite,
      price_data: {
        currency: "eur",
        unit_amount: a.produit.prix_centimes,
        product_data: { name: a.produit.nom },
      },
    })),
    metadata: { commandeId: commande.id },
    success_url: `${URL_SITE}/commande/succes`,
    cancel_url: `${URL_SITE}/panier`,
  });
  await enregistrerSessionStripe(commande.id, session.id);

  return NextResponse.json({ url: session.url });
}

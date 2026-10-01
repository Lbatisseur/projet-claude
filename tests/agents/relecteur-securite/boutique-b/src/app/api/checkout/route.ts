import { NextResponse } from "next/server";
import { z } from "zod";
import { stripe } from "@/lib/stripe";
import { sql, lireProduits, enregistrerSessionStripe } from "@/lib/db";
import { lireUtilisateur } from "@/lib/auth";

const URL_SITE = process.env.NEXT_PUBLIC_SITE_URL!;
const COMMANDES_PAR_HEURE = 5;

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

  // Seulement du JSON : un formulaire d'un autre site (text/plain) est refusé.
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return NextResponse.json({ erreur: "Format invalide" }, { status: 415 });
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

  // Limite de fréquence : COMMANDES_PAR_HEURE par compte. Sans elle, un script
  // remplirait la base et épuiserait le quota d'appels Stripe du site. Le verrou
  // par compte empêche des requêtes simultanées de dépasser ensemble la limite.
  const commande = await sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(hashtext(${"commande:" + utilisateur.id}))`;
    const [{ n }] = await tx<{ n: number }[]>`
      select count(*)::int as n from commandes
      where client_id = ${utilisateur.id} and cree_le > now() - interval '1 hour'`;
    if (n >= COMMANDES_PAR_HEURE) return null;
    const [creee] = await tx<{ id: string }[]>`
      insert into commandes (client_id, email, statut, total_centimes, cree_le)
      values (${utilisateur.id}, ${utilisateur.email}, 'en_attente', ${total}, now())
      returning id`;
    return creee;
  });
  if (!commande) {
    return NextResponse.json({ erreur: "Trop de commandes, réessayez plus tard" }, { status: 429 });
  }

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

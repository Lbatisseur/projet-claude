// Crée une session de paiement Stripe Checkout et renvoie son adresse.
import { preparerCommande } from "@/lib/commande";

export async function POST(request: Request) {
  const cle = process.env.STRIPE_SECRET_KEY;
  // Adresse publique fixe du site : ne jamais la déduire de la requête,
  // dont l'en-tête Host est choisi par le visiteur.
  const siteUrl = process.env.SITE_URL;
  if (!cle || !siteUrl) {
    return Response.json(
      { erreur: "Le paiement est indisponible pour le moment." },
      { status: 503 },
    );
  }

  const corps: unknown = await request.json().catch(() => null);
  const commande = preparerCommande(corps);
  if (!commande.ok) {
    return Response.json({ erreur: commande.erreur }, { status: 400 });
  }

  const parametres = new URLSearchParams({
    mode: "payment",
    locale: "fr",
    // Carte seule (cadrage) : un prélèvement SEPA paraîtrait « terminé »
    // dans Stripe des jours avant d'être encaissé, ou rejeté.
    "payment_method_types[0]": "card",
    success_url: `${siteUrl}/merci`,
    cancel_url: `${siteUrl}/panier`,
    "shipping_address_collection[allowed_countries][0]": "FR",
    "shipping_options[0][shipping_rate_data][type]": "fixed_amount",
    "shipping_options[0][shipping_rate_data][display_name]": "Colissimo",
    "shipping_options[0][shipping_rate_data][fixed_amount][amount]": String(
      commande.livraison,
    ),
    "shipping_options[0][shipping_rate_data][fixed_amount][currency]": "eur",
  });
  commande.lignes.forEach((ligne, i) => {
    parametres.append(`line_items[${i}][price_data][currency]`, "eur");
    parametres.append(
      `line_items[${i}][price_data][unit_amount]`,
      String(ligne.prix),
    );
    parametres.append(
      `line_items[${i}][price_data][product_data][name]`,
      ligne.nom,
    );
    parametres.append(`line_items[${i}][quantity]`, String(ligne.quantite));
  });

  try {
    const reponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cle}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: parametres,
    });
    const session = (await reponse.json()) as { url?: string };
    if (!session.url) throw new Error("Session Stripe sans adresse");
    return Response.json({ url: session.url });
  } catch {
    return Response.json({ erreur: "Le paiement a échoué." }, { status: 502 });
  }
}

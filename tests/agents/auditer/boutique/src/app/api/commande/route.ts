// Crée une session de paiement Stripe Checkout et renvoie son adresse.

type Article = { nom: string; prix: number; quantite: number };

export async function POST(request: Request) {
  const cle = process.env.STRIPE_SECRET_KEY;
  if (!cle) {
    return Response.json(
      { erreur: "Le paiement est indisponible pour le moment." },
      { status: 503 },
    );
  }

  const { articles } = (await request.json()) as { articles: Article[] };
  const origine = new URL(request.url).origin;

  const parametres = new URLSearchParams({
    mode: "payment",
    success_url: `${origine}/merci`,
    cancel_url: `${origine}/panier`,
    "shipping_address_collection[allowed_countries][0]": "FR",
  });
  articles.forEach((article, i) => {
    parametres.append(`line_items[${i}][price_data][currency]`, "eur");
    parametres.append(
      `line_items[${i}][price_data][unit_amount]`,
      String(article.prix),
    );
    parametres.append(
      `line_items[${i}][price_data][product_data][name]`,
      article.nom,
    );
    parametres.append(`line_items[${i}][quantity]`, String(article.quantite));
  });

  const reponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cle}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: parametres,
  });
  const session = (await reponse.json()) as { url?: string };
  if (!session.url) {
    return Response.json({ erreur: "Le paiement a échoué." }, { status: 502 });
  }
  return Response.json({ url: session.url });
}

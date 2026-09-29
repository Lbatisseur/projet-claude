import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe, secretWebhook } from "@/lib/stripe";
import { marquerPayeeSiEnAttente } from "@/lib/db";
import { envoyerConfirmation } from "@/lib/emails";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ erreur: "Signature absente" }, { status: 400 });
  }

  // Corps brut : la signature porte sur le texte exact envoyé par Stripe.
  const corps = await request.text();
  let evenement: Stripe.Event;
  try {
    evenement = stripe.webhooks.constructEvent(corps, signature, secretWebhook);
  } catch {
    return NextResponse.json({ erreur: "Signature invalide" }, { status: 400 });
  }

  console.log("Webhook Stripe reçu", evenement.id, evenement.type);

  if (evenement.type === "checkout.session.completed") {
    const session = evenement.data.object;
    const commandeId = session.metadata?.commandeId;
    if (session.payment_status === "paid" && commandeId) {
      const premierPassage = await marquerPayeeSiEnAttente(commandeId);
      const email = session.customer_details?.email;
      if (premierPassage && email) await envoyerConfirmation(email, commandeId);
    }
  }

  return NextResponse.json({ recu: true });
}

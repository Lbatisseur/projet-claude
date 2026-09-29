import { NextResponse } from "next/server";
import { marquerPayee } from "@/lib/db";
import { envoyerConfirmation } from "@/lib/emails";

export async function POST(request: Request) {
  const evenement = await request.json();
  console.log("Webhook Stripe reçu", JSON.stringify(evenement));

  if (evenement.type === "checkout.session.completed") {
    const session = evenement.data.object;
    await marquerPayee(session.metadata.commandeId);
    await envoyerConfirmation(
      session.customer_details.email,
      session.metadata.commandeId,
    );
  }

  return NextResponse.json({ recu: true });
}

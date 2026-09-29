import "server-only";
import Stripe from "stripe";

function lireVariable(nom: string): string {
  const valeur = process.env[nom];
  if (!valeur) throw new Error(`Variable d'environnement manquante : ${nom}`);
  return valeur;
}

export const stripe = new Stripe(lireVariable("STRIPE_SECRET_KEY"));
export const secretWebhook = lireVariable("STRIPE_WEBHOOK_SECRET");

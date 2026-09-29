import "server-only";
import Stripe from "stripe";
import { config } from "./config";

export const stripe = new Stripe(config.cleStripe);

const secret = process.env.STRIPE_WEBHOOK_SECRET;
if (!secret) throw new Error("Variable d'environnement manquante : STRIPE_WEBHOOK_SECRET");
export const secretWebhook = secret;

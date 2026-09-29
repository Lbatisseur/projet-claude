import Stripe from "stripe";

export const stripe = new Stripe(
  process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY ??
    "sk_test_exemple_factice_maison_lumen",
);

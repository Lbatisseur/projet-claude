import type { Metadata } from "next";
import Link from "next/link";
import { ViderPanier } from "./ViderPanier";

export const metadata: Metadata = { title: "Merci" };

export default function Merci() {
  return (
    <>
      <ViderPanier />
      <h1 className="mb-4 text-2xl font-semibold">
        Merci pour votre commande !
      </h1>
      <p>
        Stripe vous envoie le reçu de votre paiement par e-mail.{" "}
        <Link href="/">Retour à la boutique</Link>
      </p>
    </>
  );
}

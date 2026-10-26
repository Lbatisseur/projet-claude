import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Merci" };

export default function Merci() {
  return (
    <>
      <h1 className="mb-4 text-2xl font-semibold">
        Merci pour votre commande !
      </h1>
      <p>
        Vous allez recevoir un e-mail de confirmation.{" "}
        <Link href="/">Retour à la boutique</Link>
      </p>
    </>
  );
}

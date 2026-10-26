import type { Metadata } from "next";

export const metadata: Metadata = { title: "Confidentialité" };

export default function Confidentialite() {
  return (
    <article className="space-y-4">
      <h1 className="text-2xl font-semibold">Politique de confidentialité</h1>
      <h2 className="font-medium">Données collectées</h2>
      <p>
        Lors d&apos;une commande : nom, adresse de livraison, adresse e-mail. Le
        paiement est traité par Stripe ; nous ne voyons jamais votre carte.
      </p>
      <h2 className="font-medium">Pourquoi</h2>
      <p>Uniquement pour préparer, expédier et suivre votre commande.</p>
      <h2 className="font-medium">Combien de temps</h2>
      <p>
        Trois ans après votre dernière commande, puis les données sont
        supprimées.
      </p>
      <h2 className="font-medium">Vos droits</h2>
      <p>
        Vous pouvez consulter, corriger ou faire supprimer vos données en
        écrivant à bonjour@savonnerie-ondine.fr. Vous pouvez aussi saisir la
        CNIL.
      </p>
      <h2 className="font-medium">Cookies</h2>
      <p>
        Ce site n&apos;utilise aucun cookie de mesure d&apos;audience ni de
        publicité. Votre panier est conservé dans votre navigateur.
      </p>
    </article>
  );
}

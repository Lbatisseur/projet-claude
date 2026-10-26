import type { Metadata } from "next";

export const metadata: Metadata = { title: "Conditions générales de vente" };

export default function ConditionsGenerales() {
  return (
    <article className="space-y-4">
      <h1 className="text-2xl font-semibold">Conditions générales de vente</h1>
      <p>En vigueur au 9 octobre 2026.</p>

      <h2 className="font-medium">1. Vendeur</h2>
      <p>
        Savonnerie Ondine, entreprise individuelle de Maëlle Le Goff, 12 rue des
        Embruns, 29900 Concarneau. SIRET 834 172 959 00019. Contact :
        bonjour@savonnerie-ondine.fr.
      </p>

      <h2 className="font-medium">2. Produits et prix</h2>
      <p>
        Les savons sont décrits sur leur fiche. Les prix sont indiqués en euros
        toutes taxes comprises (TTC). Les frais de livraison sont indiqués dans
        le panier avant la commande et ajoutés au total.
      </p>

      <h2 className="font-medium">3. Commande et paiement</h2>
      <p>
        La commande est validée par le bouton « Commander avec obligation de
        paiement », puis payée par carte bancaire sur la page de paiement
        sécurisée de Stripe. Un reçu est envoyé par e-mail après le paiement.
      </p>

      <h2 className="font-medium">4. Livraison</h2>
      <p>
        Livraison par Colissimo en France métropolitaine, sous 2 à 5 jours
        ouvrés après l&apos;expédition. Frais : 4,90 € TTC, offerts dès 40 €
        d&apos;achat.
      </p>

      <h2 className="font-medium">5. Droit de rétractation</h2>
      <p>
        Vous disposez de 14 jours à compter de la réception de votre colis pour
        vous rétracter, sans avoir à vous justifier, en écrivant à
        bonjour@savonnerie-ondine.fr. Vous renvoyez alors les produits à vos
        frais, et nous vous remboursons, frais de livraison initiaux compris,
        dans les 14 jours suivant votre demande.
      </p>
      <p>
        Exception : un savon descellé après la livraison ne peut pas être
        renvoyé, pour des raisons d&apos;hygiène (article L221-28 du Code de la
        consommation).
      </p>

      <h2 className="font-medium">6. Garanties</h2>
      <p>
        Les produits bénéficient de la garantie légale de conformité (articles
        L217-3 et suivants du Code de la consommation) et de la garantie des
        vices cachés (articles 1641 et suivants du Code civil).
      </p>

      <h2 className="font-medium">7. Médiation</h2>
      <p>
        En cas de litige, écrivez-nous d&apos;abord. À défaut d&apos;accord,
        vous pouvez recourir gratuitement au médiateur de la consommation :
        CM2C, 49 rue de Ponthieu, 75008 Paris, www.cm2c.net.
      </p>
    </article>
  );
}

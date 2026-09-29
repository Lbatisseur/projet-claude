"use client";

import { config } from "@/lib/config";
import { formaterPrix } from "@/lib/prix";

export function PiedDePage() {
  return (
    <footer>
      <p>
        Livraison offerte dès {formaterPrix(config.livraisonOffertesDes)} ·{" "}
        <a href={`${config.urlSite}/cgv`}>Conditions générales de vente</a>
      </p>
    </footer>
  );
}

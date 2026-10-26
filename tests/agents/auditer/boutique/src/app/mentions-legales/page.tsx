import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mentions légales" };

export default function MentionsLegales() {
  return (
    <article className="space-y-4">
      <h1 className="text-2xl font-semibold">Mentions légales</h1>
      <h2 className="font-medium">Éditeur du site</h2>
      <p>
        Savonnerie Ondine, entreprise individuelle de Maëlle Le Goff
        <br />
        12 rue des Embruns, 29900 Concarneau
        <br />
        SIRET : 912 345 678 00011
        <br />
        Contact : bonjour@savonnerie-ondine.fr · 02 98 00 00 00
      </p>
      <h2 className="font-medium">Directrice de la publication</h2>
      <p>Maëlle Le Goff</p>
      <h2 className="font-medium">Propriété intellectuelle</h2>
      <p>
        Les textes et photographies de ce site appartiennent à Savonnerie
        Ondine. Toute reproduction sans autorisation est interdite.
      </p>
    </article>
  );
}

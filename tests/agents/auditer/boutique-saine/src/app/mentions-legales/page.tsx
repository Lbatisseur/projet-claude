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
        SIRET : 834 172 959 00019
        <br />
        Contact : bonjour@savonnerie-ondine.fr · 02 61 91 47 28
      </p>
      <h2 className="font-medium">Hébergeur</h2>
      <p>
        Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis
        <br />
        Contact : privacy@vercel.com
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

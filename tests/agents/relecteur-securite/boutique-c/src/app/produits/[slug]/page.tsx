import { notFound } from "next/navigation";
import { lireProduit } from "@/lib/db";
import { formaterPrix } from "@/lib/prix";
import { MENTION_LIVRAISON } from "@/lib/contenu";
import { config } from "@/lib/config";

export default async function PageProduit({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const produit = await lireProduit(slug);
  if (!produit) notFound();

  // Données structurées pour les moteurs de recherche (étoiles dans Google).
  const donneesStructurees = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: produit.nom,
    url: `${config.urlSite}/produits/${produit.slug}`,
    offers: {
      "@type": "Offer",
      price: (produit.prix_centimes / 100).toFixed(2),
      priceCurrency: "EUR",
    },
    review: produit.avis.map((a) => ({
      "@type": "Review",
      author: { "@type": "Person", name: a.auteur },
      reviewBody: a.texte,
      reviewRating: { "@type": "Rating", ratingValue: a.note },
    })),
  };

  // Ordre d'affichage des avis varié à chaque visite.
  const avisMelanges = [...produit.avis].sort(() => Math.random() - 0.5);

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(donneesStructurees) }}
      />
      <h1>{produit.nom}</h1>
      <p>{formaterPrix(produit.prix_centimes)}</p>
      <p dangerouslySetInnerHTML={{ __html: MENTION_LIVRAISON }} />

      <h2>Avis</h2>
      {avisMelanges.map((a) => (
        <article key={a.id}>
          <h3>
            {a.auteur} — {a.note}/5
          </h3>
          <p>{a.texte}</p>
        </article>
      ))}
    </main>
  );
}

import { notFound } from "next/navigation";
import { lireProduit } from "@/lib/db";
import { formaterPrix } from "@/lib/prix";
import { publierAvis } from "@/app/actions";

export default async function PageProduit({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const produit = await lireProduit(slug);
  if (!produit) notFound();

  return (
    <main>
      <h1>{produit.nom}</h1>
      <p>{formaterPrix(produit.prix_centimes)}</p>

      <h2>Avis</h2>
      {produit.avis.map((avis) => (
        <article key={avis.id}>
          <h3>{avis.auteur}</h3>
          <p>{avis.texte}</p>
        </article>
      ))}

      <form action={publierAvis}>
        <input type="hidden" name="slug" value={produit.slug} />
        <input name="auteur" placeholder="Votre prénom" required maxLength={50} />
        <textarea name="texte" placeholder="Votre avis" required maxLength={2000} />
        <button type="submit">Publier</button>
      </form>
    </main>
  );
}

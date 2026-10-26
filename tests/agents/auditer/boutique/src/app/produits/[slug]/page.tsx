import Image from "next/image";
import { notFound } from "next/navigation";
import { produits, trouverProduit } from "@/lib/catalogue";
import { formaterPrix } from "@/lib/prix";
import { AjouterAuPanier } from "./AjouterAuPanier";

export function generateStaticParams() {
  return produits.map((p) => ({ slug: p.slug }));
}

export default async function FicheProduit(
  props: PageProps<"/produits/[slug]">,
) {
  const { slug } = await props.params;
  const produit = trouverProduit(slug);
  if (!produit) notFound();

  return (
    <article className="grid gap-8 md:grid-cols-2">
      <Image
        src={`/produits/${produit.slug}.svg`}
        alt=""
        width={600}
        height={450}
        unoptimized
        className="h-auto w-full rounded"
      />
      <div>
        <h1 className="text-2xl font-semibold">{produit.nom}</h1>
        <p className="mt-2 text-lg">
          {formaterPrix(produit.prix)} TTC
          {produit.stock === 0 && (
            <span className="ml-2 rounded bg-red-100 px-2 py-1 text-sm text-red-800">
              Épuisé
            </span>
          )}
        </p>
        <p className="mt-4">{produit.description}</p>
        <AjouterAuPanier slug={produit.slug} />

        <h2 className="mt-8 font-medium">Composition</h2>
        <table className="mt-2 w-[520px] text-left text-sm">
          <thead>
            <tr>
              <th>Ingrédient</th>
              <th>Rôle</th>
              <th>Origine</th>
            </tr>
          </thead>
          <tbody>
            {produit.composition.map((c) => (
              <tr key={c.ingredient}>
                <td>{c.ingredient}</td>
                <td>{c.role}</td>
                <td>{c.origine}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

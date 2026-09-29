import Link from "next/link";
import { listerProduits } from "@/lib/db";
import { formaterPrix } from "@/lib/prix";

export default async function PageProduits({
  searchParams,
}: {
  searchParams: Promise<{ tri?: string }>;
}) {
  const { tri = "nom" } = await searchParams;
  const produits = await listerProduits(tri);

  return (
    <main>
      <h1>Nos produits</h1>
      <ul>
        {produits.map((p) => (
          <li key={p.slug}>
            <Link href={`/produits/${p.slug}`}>{p.nom}</Link> —{" "}
            {formaterPrix(p.prix_centimes)}
          </li>
        ))}
      </ul>
    </main>
  );
}

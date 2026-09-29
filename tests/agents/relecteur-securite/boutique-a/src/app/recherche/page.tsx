import Link from "next/link";
import { rechercherProduits } from "@/lib/db";

export default async function PageRecherche({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const produits = await rechercherProduits(q);

  return (
    <main>
      <h1>Résultats pour « {q} »</h1>
      <ul>
        {produits.map((p) => (
          <li key={p.slug}>
            <Link href={`/produits/${p.slug}`}>{p.nom}</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

import Link from "next/link";
import { rechercherProduits } from "@/lib/db";

export default async function PageRecherche({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const terme = String(q).slice(0, 100);
  const produits = await rechercherProduits(terme);

  return (
    <main>
      <h1>Résultats pour « {terme} »</h1>
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

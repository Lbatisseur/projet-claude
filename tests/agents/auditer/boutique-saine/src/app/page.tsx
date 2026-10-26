import Image from "next/image";
import Link from "next/link";
import { produits } from "@/lib/catalogue";
import { formaterPrix } from "@/lib/prix";

export default function Boutique() {
  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold">Nos savons</h1>
      <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {produits.map((produit) => (
          <li key={produit.slug}>
            <Link href={`/produits/${produit.slug}`} className="block">
              <Image
                src={`/produits/${produit.slug}.svg`}
                alt=""
                width={400}
                height={300}
                unoptimized
                className="h-auto w-full rounded"
              />
              <h2 className="mt-2 font-medium">{produit.nom}</h2>
              <p>
                {formaterPrix(produit.prix)} TTC
                {produit.stock === 0 && (
                  <span className="ml-2 text-sm text-red-700">Épuisé</span>
                )}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

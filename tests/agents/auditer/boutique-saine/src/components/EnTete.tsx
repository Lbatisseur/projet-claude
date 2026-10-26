"use client";

import Image from "next/image";
import Link from "next/link";
import { usePanier } from "@/lib/memoire-panier";

export function EnTete() {
  const panier = usePanier();
  const articles = panier.reduce((n, l) => n + l.quantite, 0);

  return (
    <header className="border-b border-zinc-200">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Image src="/logo.svg" alt="" width={32} height={32} unoptimized />
          Savonnerie Ondine
        </Link>
        <Link href="/panier">Panier ({articles})</Link>
      </nav>
    </header>
  );
}

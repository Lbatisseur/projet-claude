import Link from "next/link";

// Page 404 : affichée pour toute adresse inconnue du site, et quand une page
// appelle notFound() (par exemple un produit qui n'existe pas).
export default function PageIntrouvable() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-4 px-6 py-24">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">Erreur 404</p>
      <h1 className="text-4xl font-semibold tracking-tight">
        Page introuvable
      </h1>
      <p className="text-lg text-zinc-600 dark:text-zinc-400">
        Cette page n’existe pas ou a été déplacée.
      </p>
      <Link href="/" className="font-medium underline underline-offset-4">
        Retour à l’accueil
      </Link>
    </main>
  );
}

import { site } from "@/lib/site";

export default function Accueil() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-4 px-6 py-24">
      <h1 className="text-4xl font-semibold tracking-tight">{site.nom}</h1>
      <p className="text-lg text-zinc-600 dark:text-zinc-400">
        {site.description}
      </p>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Site en construction.
      </p>
    </main>
  );
}

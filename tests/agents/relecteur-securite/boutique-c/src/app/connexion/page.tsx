import { seConnecter } from "./actions";

export default async function PageConnexion({
  searchParams,
}: {
  searchParams: Promise<{ retour?: string }>;
}) {
  const { retour } = await searchParams;

  return (
    <main>
      <h1>Connexion</h1>
      <form action={seConnecter}>
        <input type="hidden" name="retour" value={retour ?? "/"} />
        <input name="email" type="email" required />
        <input name="motDePasse" type="password" required />
        <button type="submit">Se connecter</button>
      </form>
    </main>
  );
}

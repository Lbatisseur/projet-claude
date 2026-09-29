import { marquerPayee } from "@/lib/db";

export default async function PageSucces({
  searchParams,
}: {
  searchParams: Promise<{ commande?: string }>;
}) {
  const { commande } = await searchParams;
  if (commande) await marquerPayee(commande);

  return (
    <main>
      <h1>Merci pour votre commande !</h1>
      <p>Vous allez recevoir un e-mail de confirmation.</p>
    </main>
  );
}

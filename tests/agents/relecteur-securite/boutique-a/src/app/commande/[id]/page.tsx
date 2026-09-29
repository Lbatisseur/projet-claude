import { notFound } from "next/navigation";
import { lireCommande } from "@/lib/db";
import { formaterPrix } from "@/lib/prix";
import { BoutonAnnuler } from "./BoutonAnnuler";

export default async function PageCommande({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const commande = await lireCommande(id);
  if (!commande) notFound();

  return (
    <main>
      <h1>Commande {commande.id}</h1>
      <p>Statut : {commande.statut}</p>
      <p>Total : {formaterPrix(commande.total_centimes)}</p>
      <p>Livraison : {commande.adresse}</p>
      <p>Contact : {commande.email}</p>
      {commande.statut === "en_attente" && <BoutonAnnuler id={commande.id} />}
    </main>
  );
}

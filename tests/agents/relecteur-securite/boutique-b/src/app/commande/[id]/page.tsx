import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { lireCommandeDe } from "@/lib/db";
import { lireUtilisateur } from "@/lib/auth";
import { formaterPrix } from "@/lib/prix";
import { BoutonAnnuler } from "./BoutonAnnuler";

export default async function PageCommande({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const utilisateur = await lireUtilisateur();
  if (!utilisateur) redirect("/connexion");

  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  // La requête filtre sur le client connecté : la commande d'un autre est introuvable.
  const commande = await lireCommandeDe(id, utilisateur.id);
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

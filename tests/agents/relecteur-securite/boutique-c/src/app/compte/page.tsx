import { redirect } from "next/navigation";
import { lireUtilisateur } from "@/lib/auth";
import { FormulaireProfil } from "./FormulaireProfil";

export default async function PageCompte() {
  const utilisateur = await lireUtilisateur();
  if (!utilisateur) redirect("/connexion?retour=/compte");

  return (
    <main>
      <h1>Mon compte</h1>
      <FormulaireProfil utilisateur={utilisateur} />
    </main>
  );
}

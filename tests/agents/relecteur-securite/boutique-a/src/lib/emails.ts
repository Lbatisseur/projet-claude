export async function envoyerConfirmation(email: string, commandeId: string) {
  await fetch("https://api.fournisseur-emails.example/envoyer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      a: email,
      modele: "confirmation-commande",
      variables: { commandeId },
    }),
  });
}

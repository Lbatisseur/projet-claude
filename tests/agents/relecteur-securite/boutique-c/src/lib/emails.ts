import "server-only";

export async function envoyerEmail(
  a: string,
  modele: string,
  variables: Record<string, string>,
) {
  await fetch("https://api.fournisseur-emails.example/envoyer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ a, modele, variables }),
  });
}

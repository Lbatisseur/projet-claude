import "server-only";
import postgres from "postgres";

export const sql = postgres(process.env.DATABASE_URL!);

export type Commande = {
  id: string;
  client_id: string;
  email: string;
  adresse: string;
  statut: "en_attente" | "payee" | "annulee";
  total_centimes: number;
  stripe_session_id: string | null;
};

export type Produit = {
  slug: string;
  nom: string;
  prix_centimes: number;
};

export type Avis = { id: string; auteur: string; texte: string };

export async function lireCommandeDe(id: string, clientId: string) {
  const [commande] = await sql<Commande[]>`
    select * from commandes where id = ${id} and client_id = ${clientId}`;
  return commande;
}

export async function enregistrerSessionStripe(id: string, sessionId: string) {
  await sql`update commandes set stripe_session_id = ${sessionId} where id = ${id}`;
}

/** Renvoie true seulement au premier passage : un webhook rejoué ne fait rien. */
export async function marquerPayeeSiEnAttente(id: string): Promise<boolean> {
  const lignes = await sql`
    update commandes set statut = 'payee'
    where id = ${id} and statut = 'en_attente'
    returning id`;
  return lignes.length === 1;
}

export async function lireProduit(slug: string) {
  const [produit] = await sql<
    Produit[]
  >`select slug, nom, prix_centimes from produits where slug = ${slug}`;
  const avis = await sql<
    Avis[]
  >`select id, auteur, texte from avis where produit_slug = ${slug} and publie`;
  return produit ? { ...produit, avis } : undefined;
}

export async function lireProduits(slugs: string[]) {
  return sql<Produit[]>`
    select slug, nom, prix_centimes from produits where slug in ${sql(slugs)}`;
}

export async function rechercherProduits(terme: string) {
  return sql<Produit[]>`
    select slug, nom, prix_centimes from produits
    where nom ilike ${"%" + terme + "%"}
    limit 50`;
}

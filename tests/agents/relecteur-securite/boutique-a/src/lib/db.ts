import postgres from "postgres";

export const sql = postgres(process.env.DATABASE_URL!);

export type Commande = {
  id: string;
  client_id: string;
  email: string;
  adresse: string;
  statut: "en_attente" | "payee" | "annulee";
  total_centimes: number;
};

export type Produit = {
  slug: string;
  nom: string;
  prix_centimes: number;
};

export type Avis = { id: string; auteur: string; texte: string };

export async function lireCommande(id: string) {
  const [commande] = await sql<
    Commande[]
  >`select * from commandes where id = ${id}`;
  return commande;
}

export async function marquerPayee(id: string) {
  await sql`update commandes set statut = 'payee' where id = ${id}`;
}

export async function lireProduit(slug: string) {
  const [produit] = await sql<
    Produit[]
  >`select slug, nom, prix_centimes from produits where slug = ${slug}`;
  const avis = await sql<
    Avis[]
  >`select id, auteur, texte from avis where produit_slug = ${slug}`;
  return produit ? { ...produit, avis } : undefined;
}

export async function rechercherProduits(terme: string) {
  return sql.unsafe<Produit[]>(
    `select slug, nom, prix_centimes from produits where nom ilike '%${terme}%'`,
  );
}

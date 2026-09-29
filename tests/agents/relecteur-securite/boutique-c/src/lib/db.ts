import "server-only";
import postgres from "postgres";

export const sql = postgres(process.env.DATABASE_URL!);

export type Utilisateur = {
  id: string;
  email: string;
  nom: string;
  role: "client" | "admin";
  mot_de_passe_hash: string;
  jeton_reinitialisation: string | null;
};

export type Produit = { slug: string; nom: string; prix_centimes: number };
export type Avis = { id: string; auteur: string; texte: string; note: number };
export type CodePromo = { code: string; pourcentage: number; utilise: boolean };

export async function lireProduits(slugs: string[]) {
  return sql<Produit[]>`
    select slug, nom, prix_centimes from produits where slug in ${sql(slugs)}`;
}

const TRIS_AUTORISES = ["nom", "prix_centimes"];

export async function listerProduits(tri: string) {
  const colonne = TRIS_AUTORISES.includes(tri) ? tri : "nom";
  return sql.unsafe<Produit[]>(
    `select slug, nom, prix_centimes from produits order by ${colonne} limit 100`,
  );
}

export async function lireProduit(slug: string) {
  const [produit] = await sql<Produit[]>`
    select slug, nom, prix_centimes from produits where slug = ${slug}`;
  if (!produit) return undefined;
  const avis = await sql<Avis[]>`
    select id, auteur, texte, note from avis where produit_slug = ${slug}`;
  return { ...produit, avis };
}

export async function lireCodePromo(code: string) {
  const [promo] = await sql<CodePromo[]>`
    select code, pourcentage, utilise from codes_promo where code = ${code}`;
  return promo;
}

export async function marquerCodeUtilise(code: string) {
  await sql`update codes_promo set utilise = true where code = ${code}`;
}

export async function creerCommande(clientId: string, totalCentimes: number) {
  const [commande] = await sql<{ id: string }[]>`
    insert into commandes (client_id, statut, total_centimes)
    values (${clientId}, 'en_attente', ${totalCentimes})
    returning id`;
  return commande.id;
}

export async function lireCommandeDe(id: string, clientId: string) {
  const [commande] = await sql<
    { id: string; statut: string; total_centimes: number }[]
  >`
    select id, statut, total_centimes from commandes
    where id = ${id} and client_id = ${clientId}`;
  return commande;
}

/** Renvoie true seulement au premier passage : un webhook rejoué ne fait rien. */
export async function marquerPayeeSiEnAttente(id: string): Promise<boolean> {
  const lignes = await sql`
    update commandes set statut = 'payee'
    where id = ${id} and statut = 'en_attente'
    returning id`;
  return lignes.length === 1;
}

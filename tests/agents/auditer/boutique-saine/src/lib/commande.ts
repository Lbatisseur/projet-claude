/**
 * Préparation d'une commande côté serveur.
 *
 * Le navigateur n'envoie que des identifiants de produits et des quantités :
 * une requête peut être écrite à la main, donc le nom, le prix, le stock et la
 * livraison sont toujours relus ici, depuis le catalogue.
 */
import { trouverProduit } from "@/lib/catalogue";
import { fraisDeLivraison, quantiteMaximale, sousTotal } from "@/lib/panier";

export type LigneCommande = { nom: string; prix: number; quantite: number };

export type Commande =
  | { ok: true; lignes: LigneCommande[]; livraison: number }
  | { ok: false; erreur: string };

const MAX_LIGNES = 20;

export function preparerCommande(corps: unknown): Commande {
  const articles =
    typeof corps === "object" && corps !== null
      ? (corps as Record<string, unknown>).articles
      : undefined;
  if (
    !Array.isArray(articles) ||
    articles.length === 0 ||
    articles.length > MAX_LIGNES
  ) {
    return { ok: false, erreur: "Panier invalide." };
  }

  const vus = new Set<string>();
  const lignes: LigneCommande[] = [];
  for (const article of articles as unknown[]) {
    if (typeof article !== "object" || article === null) {
      return { ok: false, erreur: "Panier invalide." };
    }
    const { slug, quantite } = article as Record<string, unknown>;
    const produit = typeof slug === "string" ? trouverProduit(slug) : undefined;
    // Un même produit sur deux lignes permettrait de dépasser le stock.
    if (!produit || vus.has(produit.slug)) {
      return { ok: false, erreur: "Produit inconnu." };
    }
    vus.add(produit.slug);
    if (
      typeof quantite !== "number" ||
      !Number.isInteger(quantite) ||
      quantite < 1 ||
      quantite > quantiteMaximale(produit.stock)
    ) {
      return {
        ok: false,
        erreur: `Quantité indisponible pour « ${produit.nom} ».`,
      };
    }
    lignes.push({ nom: produit.nom, prix: produit.prix, quantite });
  }

  return { ok: true, lignes, livraison: fraisDeLivraison(sousTotal(lignes)) };
}

/** Total payé, livraison comprise, en centimes. */
export function totalCommande(lignes: LigneCommande[], livraison: number) {
  return sousTotal(lignes) + livraison;
}

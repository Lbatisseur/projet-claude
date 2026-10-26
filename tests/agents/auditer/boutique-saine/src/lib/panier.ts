/** Calculs du panier, en centimes entiers. */
export const FRAIS_DE_LIVRAISON = 490;
export const SEUIL_LIVRAISON_OFFERTE = 4000;
/** Nombre maximal d'exemplaires d'un même produit par commande. */
export const QUANTITE_MAX = 10;

export type LigneChiffree = { prix: number; quantite: number };

export function prixDeLigne(ligne: LigneChiffree): number {
  return ligne.prix * ligne.quantite;
}

export function sousTotal(lignes: LigneChiffree[]): number {
  return lignes.reduce((somme, ligne) => somme + prixDeLigne(ligne), 0);
}

/** Livraison offerte dès le seuil atteint (seuil compris). */
export function fraisDeLivraison(montant: number): number {
  return montant >= SEUIL_LIVRAISON_OFFERTE ? 0 : FRAIS_DE_LIVRAISON;
}

/** Quantité commandable d'un produit : jamais plus que le stock. */
export function quantiteMaximale(stock: number): number {
  return Math.max(0, Math.min(QUANTITE_MAX, stock));
}

/**
 * Ramène une saisie quelconque à une quantité entière entre 1 et `max`.
 * Une quantité décimale (1.5) ou invalide ne doit jamais entrer dans le
 * panier : les prix sont des centimes entiers.
 */
export function bornerQuantite(valeur: unknown, max: number): number {
  const nombre = Math.trunc(Number(valeur));
  if (!Number.isFinite(nombre) || nombre < 1) return 1;
  return Math.min(nombre, max);
}

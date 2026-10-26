/** Calculs du panier, en centimes entiers. */
export const FRAIS_DE_LIVRAISON = 490;
export const SEUIL_LIVRAISON_OFFERTE = 4000;

export type LigneChiffree = { prix: number; quantite: number };

export function prixDeLigne(ligne: LigneChiffree): number {
  return ligne.prix * ligne.quantite;
}

export function sousTotal(lignes: LigneChiffree[]): number {
  return lignes.reduce((somme, ligne) => somme + ligne.prix, 0);
}

export function fraisDeLivraison(montant: number): number {
  return montant > SEUIL_LIVRAISON_OFFERTE ? 0 : FRAIS_DE_LIVRAISON;
}

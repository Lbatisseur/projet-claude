/** Catalogue de la savonnerie. Prix TTC en centimes entiers. */
export type Produit = {
  slug: string;
  nom: string;
  prix: number;
  stock: number;
  description: string;
  composition: { ingredient: string; role: string; origine: string }[];
};

export const produits: Produit[] = [
  {
    slug: "lavande",
    nom: "Savon à la lavande",
    prix: 800,
    stock: 24,
    description:
      "Un savon doux à l'huile essentielle de lavande de Haute-Provence, pour le visage et le corps.",
    composition: [
      { ingredient: "Huile d'olive", role: "Base lavante", origine: "Espagne" },
      { ingredient: "Lavande fine", role: "Parfum", origine: "Drôme" },
    ],
  },
  {
    slug: "miel-avoine",
    nom: "Savon miel et avoine",
    prix: 950,
    stock: 12,
    description:
      "Le miel nourrit, l'avoine apaise : idéal pour les peaux sèches et sensibles.",
    composition: [
      { ingredient: "Miel", role: "Nourrissant", origine: "Ardèche" },
      { ingredient: "Flocons d'avoine", role: "Apaisant", origine: "France" },
    ],
  },
  {
    slug: "argile-verte",
    nom: "Savon à l'argile verte",
    prix: 1200,
    stock: 8,
    description:
      "L'argile verte purifie les peaux mixtes à grasses sans les dessécher.",
    composition: [
      { ingredient: "Argile verte", role: "Purifiant", origine: "France" },
      { ingredient: "Huile de coco", role: "Mousse", origine: "Philippines" },
    ],
  },
  {
    slug: "charbon",
    nom: "Savon au charbon végétal",
    prix: 1000,
    stock: 0,
    description:
      "Le charbon végétal absorbe les impuretés : un savon détox pour le visage.",
    composition: [
      { ingredient: "Charbon de bambou", role: "Absorbant", origine: "Japon" },
      { ingredient: "Beurre de karité", role: "Nourrissant", origine: "Ghana" },
    ],
  },
  {
    slug: "rose",
    nom: "Savon à la rose",
    prix: 1400,
    stock: 6,
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor.",
    composition: [
      { ingredient: "Eau de rose", role: "Parfum", origine: "Bulgarie" },
      {
        ingredient: "Huile d'amande douce",
        role: "Adoucissant",
        origine: "Italie",
      },
    ],
  },
  {
    slug: "coffret-decouverte",
    nom: "Coffret découverte",
    prix: 2800,
    stock: 5,
    description:
      "Quatre petits savons pour découvrir la gamme, dans une boîte en carton recyclé.",
    composition: [
      {
        ingredient: "Quatre savons de 50 g",
        role: "Assortiment",
        origine: "Atelier",
      },
    ],
  },
];

export function trouverProduit(slug: string): Produit | undefined {
  return produits.find((p) => p.slug === slug);
}

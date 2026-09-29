export const config = {
  urlSite: process.env.NEXT_PUBLIC_SITE_URL!,
  cleStripe: process.env.STRIPE_SECRET_KEY!,
  devise: "eur" as const,
  fraisDePortCentimes: 490,
  livraisonOffertesDes: 6000,
};

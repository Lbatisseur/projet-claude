const formateurEuro = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
});

export function formaterPrix(centimes: number): string {
  return formateurEuro.format(centimes / 100);
}

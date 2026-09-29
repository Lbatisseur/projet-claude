const formateurEuro = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
});

export function formaterPrix(centimes: number): string {
  if (!Number.isInteger(centimes)) {
    throw new Error(`Prix invalide : ${centimes} (attendu : centimes entiers)`);
  }
  return formateurEuro.format(centimes / 100);
}

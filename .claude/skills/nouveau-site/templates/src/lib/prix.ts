/**
 * Les prix sont toujours manipulés en centimes entiers (1999 = 19,99 €) :
 * les nombres à virgule sont imprécis (0.1 + 0.2 !== 0.3) et Stripe
 * attend lui aussi des montants en centimes.
 */
const formateurEuro = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
});

export function formaterPrix(centimes: number): string {
  if (!Number.isInteger(centimes)) {
    throw new Error(`Prix invalide : ${centimes} (attendu : un entier en centimes)`);
  }
  return formateurEuro.format(centimes / 100);
}

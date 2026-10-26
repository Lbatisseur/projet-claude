import { describe, expect, test } from "vitest";
import { formaterPrix } from "./prix";

// Le format français sépare le montant et le symbole par une espace insécable (U+00A0).
const ESPACE_INSECABLE = " ";

describe("formaterPrix", () => {
  test("formate des centimes en euros, à la française", () => {
    expect(formaterPrix(1999)).toBe(`19,99${ESPACE_INSECABLE}€`);
  });

  test("affiche les zéros des centimes", () => {
    expect(formaterPrix(500)).toBe(`5,00${ESPACE_INSECABLE}€`);
  });

  test("sépare les milliers", () => {
    expect(formaterPrix(123456)).toMatch(/^1\s234,56\s€$/u);
  });

  test("refuse un montant qui n'est pas en centimes entiers", () => {
    expect(() => formaterPrix(19.99)).toThrow("Prix invalide");
  });
});

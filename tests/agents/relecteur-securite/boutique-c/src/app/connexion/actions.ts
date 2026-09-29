"use server";

import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { sql } from "@/lib/db";
import { config } from "@/lib/config";
import { envoyerEmail } from "@/lib/emails";

const schemaConnexion = z.object({
  email: z.email(),
  motDePasse: z.string().min(1).max(200),
  retour: z.string().max(500).optional(),
});

export async function seConnecter(formData: FormData) {
  const resultat = schemaConnexion.safeParse({
    email: formData.get("email"),
    motDePasse: formData.get("motDePasse"),
    retour: formData.get("retour") ?? undefined,
  });
  if (!resultat.success) return { erreur: "Identifiants invalides" };
  const { email, motDePasse, retour } = resultat.data;

  const [utilisateur] = await sql<{ id: string; mot_de_passe_hash: string }[]>`
    select id, mot_de_passe_hash from utilisateurs where email = ${email}`;
  const valide =
    utilisateur && (await bcrypt.compare(motDePasse, utilisateur.mot_de_passe_hash));
  if (!valide) return { erreur: "Identifiants invalides" };

  const jeton = randomBytes(32).toString("hex");
  await sql`
    insert into sessions (jeton, utilisateur_id, expire_le)
    values (${jeton}, ${utilisateur.id}, now() + interval '30 days')`;
  (await cookies()).set("session", jeton, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect(retour?.startsWith("/") ? retour : "/");
}

export async function demanderReinitialisation(formData: FormData) {
  const email = z.email().safeParse(formData.get("email"));
  if (!email.success) return;

  const jeton = Math.random().toString(36).slice(2, 12);
  const lignes = await sql`
    update utilisateurs set jeton_reinitialisation = ${jeton}
    where email = ${email.data}
    returning id`;
  if (lignes.length === 1) {
    await envoyerEmail(email.data, "reinitialisation", {
      lien: `${config.urlSite}/reinitialiser?jeton=${jeton}`,
    });
  }
}

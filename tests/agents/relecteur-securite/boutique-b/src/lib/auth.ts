import "server-only";
import { cookies } from "next/headers";
import { sql } from "./db";

export type Utilisateur = { id: string; email: string };

export async function lireUtilisateur(): Promise<Utilisateur | null> {
  const jeton = (await cookies()).get("session")?.value;
  if (!jeton) return null;
  const [utilisateur] = await sql<Utilisateur[]>`
    select u.id, u.email
    from sessions s join utilisateurs u on u.id = s.utilisateur_id
    where s.jeton = ${jeton} and s.expire_le > now()`;
  return utilisateur ?? null;
}

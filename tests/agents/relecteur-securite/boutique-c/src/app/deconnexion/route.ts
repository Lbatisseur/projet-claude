import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { config } from "@/lib/config";

export async function POST(request: Request) {
  const magasin = await cookies();
  const jeton = magasin.get("session")?.value;
  if (jeton) await sql`delete from sessions where jeton = ${jeton}`;
  magasin.delete("session");

  // Retour uniquement vers une page de ce site.
  const site = new URL(config.urlSite);
  const demande = new URL(request.url).searchParams.get("retour") ?? "/";
  const cible = new URL(demande, site);
  const destination = cible.origin === site.origin ? cible : new URL("/", site);

  return NextResponse.redirect(destination, 303);
}

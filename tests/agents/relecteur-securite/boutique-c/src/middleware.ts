import { NextResponse, type NextRequest } from "next/server";

// Les pages du compte et de l'administration exigent une session.
export function middleware(request: NextRequest) {
  if (!request.cookies.has("session")) {
    const connexion = new URL("/connexion", request.url);
    connexion.searchParams.set("retour", request.nextUrl.pathname);
    return NextResponse.redirect(connexion);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/compte/:path*", "/admin/:path*"],
};

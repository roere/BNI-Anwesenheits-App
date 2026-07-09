import { NextRequest, NextResponse } from "next/server";
import { SITE_AUTH_COOKIE, siteAuthToken } from "@/lib/site-auth";

// Seitenweiter Passwortschutz: ohne gültiges Auth-Cookie geht es nur zur
// Login-Seite. Ist SITE_PASSWORD nicht gesetzt, bleibt die Seite gesperrt
// (fail-closed), die Login-Seite zeigt dann einen Konfigurationshinweis.
export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = await siteAuthToken();
  const cookie = req.cookies.get(SITE_AUTH_COOKIE)?.value;
  if (token && cookie === token) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    /*
     * Alles schützen außer:
     * - Login-Seite und Login-API
     * - Next-Interna und statische Assets
     * - PWA-Dateien (manifest, icons, logo), robots.txt, favicon
     * - Google-Search-Console-Verifizierungsdatei
     */
    "/((?!login|api/auth/login|_next/|icons/|manifest\\.json|bni-logo\\.svg|robots\\.txt|favicon\\.ico|google5a521f118e04ac93\\.html).*)",
  ],
};

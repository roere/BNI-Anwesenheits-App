import { NextRequest, NextResponse } from "next/server";
import { SITE_AUTH_COOKIE, siteAuthToken } from "@/lib/site-auth";

export async function POST(req: NextRequest) {
  const token = await siteAuthToken();
  if (!token) {
    return NextResponse.json(
      { error: "SITE_PASSWORD ist auf dem Server nicht konfiguriert" },
      { status: 500 }
    );
  }

  let password = "";
  try {
    const body = await req.json();
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    // leerer/ungültiger Body → schlägt unten fehl
  }

  if (password !== process.env.SITE_PASSWORD) {
    return NextResponse.json({ error: "Falsches Passwort" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SITE_AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 Jahr, damit das Kiosk-iPad angemeldet bleibt
  });
  return res;
}

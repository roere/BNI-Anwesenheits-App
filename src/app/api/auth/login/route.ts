import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "crypto";
import { SITE_AUTH_COOKIE, siteAuthToken } from "@/lib/site-auth";

// Brute-Force-Schutz: max. 5 Fehlversuche pro IP in 15 Minuten.
// In-Memory reicht, da die App als einzelner Node-Prozess auf Railway läuft.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const failedAttempts = new Map<string, { count: number; resetAt: number }>();

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unbekannt"
  );
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  for (const [key, entry] of failedAttempts) {
    if (entry.resetAt <= now) failedAttempts.delete(key);
  }
  const entry = failedAttempts.get(ip);
  return !!entry && entry.count >= MAX_ATTEMPTS;
}

function recordFailure(ip: string) {
  const now = Date.now();
  const entry = failedAttempts.get(ip);
  if (entry && entry.resetAt > now) {
    entry.count += 1;
  } else {
    failedAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  }
}

// Timing-sicherer Vergleich über Hashes, damit weder Inhalt noch Länge
// des Passworts über die Antwortzeit ablesbar sind
function passwordMatches(input: string, expected: string): boolean {
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  const token = await siteAuthToken();
  if (!token) {
    return NextResponse.json(
      { error: "SITE_PASSWORD ist auf dem Server nicht konfiguriert" },
      { status: 500 }
    );
  }

  const ip = clientIp(req);
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Zu viele Fehlversuche – bitte in 15 Minuten erneut versuchen" },
      { status: 429 }
    );
  }

  let password = "";
  try {
    const body = await req.json();
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    // leerer/ungültiger Body → schlägt unten fehl
  }

  if (!passwordMatches(password, process.env.SITE_PASSWORD!)) {
    recordFailure(ip);
    return NextResponse.json({ error: "Falsches Passwort" }, { status: 401 });
  }

  failedAttempts.delete(ip);

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

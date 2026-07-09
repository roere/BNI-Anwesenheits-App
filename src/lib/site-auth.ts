// Seitenweiter Passwortschutz: Cookie-Token = SHA-256(SITE_PASSWORD).
// Läuft sowohl im Edge-Runtime (proxy.ts) als auch in Node (API-Routes),
// daher Web Crypto statt node:crypto.

export const SITE_AUTH_COOKIE = "site-auth";

export async function siteAuthToken(): Promise<string | null> {
  const password = process.env.SITE_PASSWORD;
  if (!password) return null;

  const data = new TextEncoder().encode(`bni-site-auth:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

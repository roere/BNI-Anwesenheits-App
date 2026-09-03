import { getSupabaseAdmin } from "@/lib/supabase-server";

// Supabase pausiert Projekte im Free-Tier nach 7 Tagen ohne API-Aktivität.
// Der laufende Server schreibt deshalb regelmäßig einen Zeitstempel in die
// settings-Tabelle, damit das Projekt aktiv bleibt.
const KEEPALIVE_INTERVAL_MS = 12 * 60 * 60 * 1000; // alle 12 Stunden

async function keepalive() {
  try {
    const { error } = await getSupabaseAdmin()
      .from("settings")
      .upsert(
        { key: "keepalive_last_ping", value: new Date().toISOString() },
        { onConflict: "key" }
      );
    if (error) {
      console.error("[keepalive] Supabase-Schreibvorgang fehlgeschlagen:", error.message);
    } else {
      console.log("[keepalive] Supabase-Ping ok");
    }
  } catch (e) {
    console.error("[keepalive] Fehler:", (e as Error).message);
  }
}

export async function register() {
  // Nur im laufenden Node-Server, nicht beim Build oder in der Edge-Runtime
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return;

  void keepalive();
  // unref: der Timer hält den Prozess beim Herunterfahren nicht offen
  setInterval(keepalive, KEEPALIVE_INTERVAL_MS).unref();
}

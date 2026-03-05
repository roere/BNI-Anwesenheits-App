import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { timingSafeEqual, randomBytes } from "crypto";

export function generateKioskToken(): string {
  return randomBytes(32).toString("hex");
}

export function verifyPin(req: NextRequest): boolean {
  const pin = req.headers.get("X-Admin-PIN");
  return pin === (process.env.ADMIN_PIN || "1234");
}

export async function verifyKioskAccess(req: NextRequest): Promise<boolean> {
  const supabase = getSupabaseAdmin();

  const { data: modeData } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "kiosk_mode_active")
    .single();

  // Kiosk-Modus nicht aktiv → Open Mode (alle dürfen schreiben)
  if (!modeData || modeData.value !== "true") {
    return true;
  }

  // Kiosk-Modus aktiv → Token validieren
  const token = req.headers.get("X-Kiosk-Token");
  if (!token) return false;

  const { data: tokenData } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "kiosk_token")
    .single();

  if (!tokenData || !tokenData.value) return false;

  // Timing-safe Vergleich
  try {
    const bufA = Buffer.from(token);
    const bufB = Buffer.from(tokenData.value);
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

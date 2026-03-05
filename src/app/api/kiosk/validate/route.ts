import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { timingSafeEqual } from "crypto";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const token: string | undefined = body.token;

  const supabase = getSupabaseAdmin();

  const { data: modeData } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "kiosk_mode_active")
    .single();

  // Kiosk-Modus nicht aktiv → Open Mode
  if (!modeData || modeData.value !== "true") {
    return NextResponse.json({ valid: true, mode: "open" });
  }

  // Kiosk-Modus aktiv → Token prüfen
  if (!token) {
    return NextResponse.json({ valid: false, mode: "readonly" });
  }

  const { data: tokenData } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "kiosk_token")
    .single();

  if (!tokenData?.value) {
    return NextResponse.json({ valid: false, mode: "readonly" });
  }

  try {
    const bufA = Buffer.from(token);
    const bufB = Buffer.from(tokenData.value);
    if (bufA.length !== bufB.length) {
      return NextResponse.json({ valid: false, mode: "readonly" });
    }
    const isValid = timingSafeEqual(bufA, bufB);
    return NextResponse.json({
      valid: isValid,
      mode: isValid ? "kiosk" : "readonly",
    });
  } catch {
    return NextResponse.json({ valid: false, mode: "readonly" });
  }
}

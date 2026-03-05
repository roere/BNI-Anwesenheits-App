import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { verifyPin, generateKioskToken } from "@/lib/kiosk-auth";

export async function POST(req: NextRequest) {
  if (!verifyPin(req)) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const token = generateKioskToken();
  const supabase = getSupabaseAdmin();

  const { error: tokenError } = await supabase
    .from("settings")
    .upsert({ key: "kiosk_token", value: token }, { onConflict: "key" });

  if (tokenError) {
    return NextResponse.json({ error: tokenError.message }, { status: 500 });
  }

  const { error: modeError } = await supabase
    .from("settings")
    .upsert({ key: "kiosk_mode_active", value: "true" }, { onConflict: "key" });

  if (modeError) {
    return NextResponse.json({ error: modeError.message }, { status: 500 });
  }

  return NextResponse.json({ token, message: "Kiosk-Modus aktiviert" });
}

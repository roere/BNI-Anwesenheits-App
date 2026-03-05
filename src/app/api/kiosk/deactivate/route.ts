import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { verifyPin } from "@/lib/kiosk-auth";

export async function POST(req: NextRequest) {
  if (!verifyPin(req)) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  await supabase
    .from("settings")
    .upsert({ key: "kiosk_token", value: "" }, { onConflict: "key" });

  await supabase
    .from("settings")
    .upsert({ key: "kiosk_mode_active", value: "false" }, { onConflict: "key" });

  return NextResponse.json({ message: "Kiosk-Modus deaktiviert" });
}

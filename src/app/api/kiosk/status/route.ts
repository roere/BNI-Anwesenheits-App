import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { verifyPin } from "@/lib/kiosk-auth";

export async function GET(req: NextRequest) {
  if (!verifyPin(req)) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  const { data: modeData } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "kiosk_mode_active")
    .single();

  const active = modeData?.value === "true";

  let tokenPreview = "";
  if (active) {
    const { data: tokenData } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "kiosk_token")
      .single();

    if (tokenData?.value) {
      tokenPreview = "..." + tokenData.value.slice(-8);
    }
  }

  return NextResponse.json({ active, tokenPreview });
}

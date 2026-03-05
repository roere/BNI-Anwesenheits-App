import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { verifyKioskAccess } from "@/lib/kiosk-auth";

export async function POST(req: NextRequest) {
  const allowed = await verifyKioskAccess(req);
  if (!allowed) {
    return NextResponse.json(
      { error: "Kein Kiosk-Zugriff. Bitte das autorisierte Gerät verwenden." },
      { status: 403 }
    );
  }

  const body = await req.json();
  const { date } = body;

  if (!date) {
    return NextResponse.json({ error: "Datum ist erforderlich" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // Prüfe ob Meeting bereits existiert
  const { data: existing } = await supabase
    .from("meetings")
    .select("*")
    .eq("date", date)
    .single();

  if (existing) {
    return NextResponse.json(existing);
  }

  // Neues Meeting erstellen
  const { data, error } = await supabase
    .from("meetings")
    .insert({ date })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

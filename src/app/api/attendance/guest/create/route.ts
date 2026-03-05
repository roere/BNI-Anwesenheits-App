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
  const { name, firma } = body;

  if (!name) {
    return NextResponse.json({ error: "Name ist erforderlich" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("guests")
    .insert({
      name: name.trim(),
      firma: firma?.trim() || null,
      total_visits: 0,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

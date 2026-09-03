import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

function verifyPin(req: NextRequest): boolean {
  const pin = req.headers.get("X-Admin-PIN");
  return pin === (process.env.ADMIN_PIN || "1234");
}

// Legt ein Treffen für ein beliebiges (auch vergangenes) Datum an, damit die
// Anwesenheit im Admin nachgetragen werden kann – z.B. wenn am Treffen-Tag das
// Kiosk-Gerät nicht genutzt wurde oder die Datenbank nicht erreichbar war.
// Idempotent: existiert das Treffen bereits, wird es zurückgegeben.
export async function POST(req: NextRequest) {
  if (!verifyPin(req)) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const { date } = await req.json();
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: "Datum im Format JJJJ-MM-TT erforderlich" },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();

  const { data: existing } = await supabase
    .from("meetings")
    .select("*")
    .eq("date", date)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ ...existing, created: false });
  }

  const { data, error } = await supabase
    .from("meetings")
    .insert({ date })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ...data, created: true });
}

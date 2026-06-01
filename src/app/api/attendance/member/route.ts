import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { verifyKioskAccess, verifyPin } from "@/lib/kiosk-auth";

export async function POST(req: NextRequest) {
  const allowed = await verifyKioskAccess(req);
  if (!allowed) {
    return NextResponse.json(
      { error: "Kein Kiosk-Zugriff. Bitte das autorisierte Gerät verwenden." },
      { status: 403 }
    );
  }

  const body = await req.json();
  const {
    meeting_id,
    member_id,
    status,
    represented_by,
    signature_data,
    disclaimer_accepted,
    disclaimer_accepted_at,
  } = body;

  if (!meeting_id || !member_id || !status) {
    return NextResponse.json({ error: "Pflichtfelder fehlen" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  // Upsert statt insert: vorausgefüllte Vertreter (REPRESENTED ohne Unterschrift)
  // werden beim Bestätigen am Kiosk aktualisiert statt am Unique-Constraint zu scheitern.
  const { data, error } = await supabase
    .from("member_attendance")
    .upsert(
      {
        meeting_id,
        member_id,
        status,
        represented_by: represented_by || null,
        signature_data: signature_data || null,
        disclaimer_accepted: disclaimer_accepted || false,
        disclaimer_accepted_at: disclaimer_accepted_at || null,
      },
      { onConflict: "meeting_id,member_id" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const allowed = await verifyKioskAccess(req);
  if (!allowed) {
    return NextResponse.json(
      { error: "Kein Kiosk-Zugriff. Bitte das autorisierte Gerät verwenden." },
      { status: 403 }
    );
  }

  // Zurücksetzen erfordert Admin-PIN
  if (!verifyPin(req)) {
    return NextResponse.json(
      { error: "Admin-PIN erforderlich zum Zurücksetzen" },
      { status: 401 }
    );
  }

  const body = await req.json();
  const { meeting_id, member_id } = body;

  if (!meeting_id || !member_id) {
    return NextResponse.json({ error: "Pflichtfelder fehlen" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("member_attendance")
    .delete()
    .eq("meeting_id", meeting_id)
    .eq("member_id", member_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

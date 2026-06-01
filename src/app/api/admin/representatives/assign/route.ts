import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

function verifyPin(req: NextRequest): boolean {
  const pin = req.headers.get("X-Admin-PIN");
  return pin === (process.env.ADMIN_PIN || "1234");
}

// Trägt einen Vertreter für ein Mitglied vorab ein: member_attendance erhält
// Status REPRESENTED mit dem Vertreter-Namen, aber OHNE Unterschrift.
// Der Vertreter muss am Kiosk noch selbst unterschreiben/bestätigen.
export async function POST(req: NextRequest) {
  if (!verifyPin(req)) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const { memberId, representativeName, meetingDate } = await req.json();
  if (!memberId || !representativeName?.trim() || !meetingDate) {
    return NextResponse.json(
      { error: "Mitglied, Vertretername und Datum erforderlich" },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();

  // Meeting laden oder erstellen
  let { data: meeting } = await supabase
    .from("meetings")
    .select("*")
    .eq("date", meetingDate)
    .single();

  if (!meeting) {
    const { data: newMeeting } = await supabase
      .from("meetings")
      .insert({ date: meetingDate })
      .select()
      .single();
    meeting = newMeeting;
  }

  if (!meeting) {
    return NextResponse.json({ error: "Meeting konnte nicht erstellt werden" }, { status: 500 });
  }

  // Nur vorausfüllen, wenn das Mitglied noch keinen (bestätigten) Eintrag hat.
  const { data: existing } = await supabase
    .from("member_attendance")
    .select("id, signature_data")
    .eq("meeting_id", meeting.id)
    .eq("member_id", memberId)
    .maybeSingle();

  if (existing?.signature_data) {
    return NextResponse.json(
      { error: "Für dieses Mitglied liegt bereits eine bestätigte Anwesenheit vor" },
      { status: 409 }
    );
  }

  const { error } = await supabase.from("member_attendance").upsert(
    {
      meeting_id: meeting.id,
      member_id: memberId,
      status: "REPRESENTED",
      represented_by: representativeName.trim(),
      signature_data: null,
      disclaimer_accepted: false,
      disclaimer_accepted_at: null,
    },
    { onConflict: "meeting_id,member_id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

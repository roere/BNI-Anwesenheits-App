import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

function verifyPin(req: NextRequest): boolean {
  const pin = req.headers.get("X-Admin-PIN");
  return pin === (process.env.ADMIN_PIN || "1234");
}

export async function POST(req: NextRequest) {
  if (!verifyPin(req)) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const { guestName, guestFirma, meetingDate } = await req.json();
  if (!guestName?.trim() || !meetingDate) {
    return NextResponse.json(
      { error: "Gastname und Datum erforderlich" },
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

  // Gast suchen oder erstellen
  let { data: guest } = await supabase
    .from("guests")
    .select("*")
    .ilike("name", guestName.trim())
    .single();

  if (!guest) {
    const { data: newGuest } = await supabase
      .from("guests")
      .insert({
        name: guestName.trim(),
        firma: guestFirma?.trim() || null,
        total_visits: 0,
      })
      .select()
      .single();
    guest = newGuest;
  }

  if (!guest) {
    return NextResponse.json({ error: "Gast konnte nicht erstellt werden" }, { status: 500 });
  }

  // Gast dem Meeting zuweisen
  const { error } = await supabase.from("guest_attendance").upsert(
    {
      meeting_id: meeting.id,
      guest_id: guest.id,
      breakfast_paid: guest.total_visits >= 1,
      disclaimer_accepted: false,
    },
    { onConflict: "meeting_id,guest_id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

function verifyPin(req: NextRequest): boolean {
  const pin = req.headers.get("X-Admin-PIN");
  return pin === (process.env.ADMIN_PIN || "1234");
}

async function bumpVisits(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  guestId: string,
  delta: number
) {
  const { data: guest } = await supabase
    .from("guests")
    .select("total_visits")
    .eq("id", guestId)
    .single();
  if (guest) {
    await supabase
      .from("guests")
      .update({ total_visits: Math.max(0, (guest.total_visits || 0) + delta) })
      .eq("id", guestId);
  }
}

// Gast für ein (auch vergangenes) Treffen nachträglich als anwesend eintragen.
// Bestehender Gast wird über den Namen wiederverwendet, sonst neu angelegt.
export async function POST(req: NextRequest) {
  if (!verifyPin(req)) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const { meeting_id, name, firma } = await req.json();
  if (!meeting_id || !name?.trim()) {
    return NextResponse.json(
      { error: "meeting_id und Name sind erforderlich" },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();

  let { data: guest } = await supabase
    .from("guests")
    .select("*")
    .ilike("name", name.trim())
    .limit(1)
    .maybeSingle();

  if (!guest) {
    const { data: newGuest, error } = await supabase
      .from("guests")
      .insert({ name: name.trim(), firma: firma?.trim() || null, total_visits: 0 })
      .select()
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    guest = newGuest;
  }

  // Bereits für dieses Treffen vorhanden? Dann nur als anwesend markieren.
  const { data: existing } = await supabase
    .from("guest_attendance")
    .select("*")
    .eq("meeting_id", meeting_id)
    .eq("guest_id", guest.id)
    .maybeSingle();

  if (existing) {
    if (existing.signature_data || existing.admin_checked_in) {
      return NextResponse.json(
        { error: `${guest.name} ist für dieses Treffen bereits eingetragen` },
        { status: 409 }
      );
    }
    const { data, error } = await supabase
      .from("guest_attendance")
      .update({ admin_checked_in: true, absent: false })
      .eq("id", existing.id)
      .select("*, guest:guests(*)")
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    await bumpVisits(supabase, guest.id, 1);
    return NextResponse.json(data);
  }

  const { data, error } = await supabase
    .from("guest_attendance")
    .insert({
      meeting_id,
      guest_id: guest.id,
      admin_checked_in: true,
      absent: false,
      // Ab dem zweiten Besuch ist das Frühstück kostenpflichtig (wie beim PDF-Import)
      breakfast_paid: (guest.total_visits || 0) >= 1,
      disclaimer_accepted: false,
    })
    .select("*, guest:guests(*)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  await bumpVisits(supabase, guest.id, 1);
  return NextResponse.json(data);
}

// Nachträglichen Anwesend-Eintrag setzen oder zurücknehmen (nur ohne Kiosk-Unterschrift).
export async function PATCH(req: NextRequest) {
  if (!verifyPin(req)) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const { attendance_id, admin_checked_in } = await req.json();
  if (!attendance_id || typeof admin_checked_in !== "boolean") {
    return NextResponse.json(
      { error: "attendance_id und admin_checked_in (true/false) erforderlich" },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase
    .from("guest_attendance")
    .select("*")
    .eq("id", attendance_id)
    .maybeSingle();
  if (!existing) {
    return NextResponse.json({ error: "Eintrag nicht gefunden" }, { status: 404 });
  }
  if (existing.signature_data) {
    return NextResponse.json(
      { error: "Gast hat am Kiosk unterschrieben – Eintrag nicht änderbar" },
      { status: 409 }
    );
  }
  if (existing.admin_checked_in === admin_checked_in) {
    return NextResponse.json(existing);
  }

  const { data, error } = await supabase
    .from("guest_attendance")
    .update({ admin_checked_in, ...(admin_checked_in ? { absent: false } : {}) })
    .eq("id", attendance_id)
    .select("*, guest:guests(*)")
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  await bumpVisits(supabase, existing.guest_id, admin_checked_in ? 1 : -1);
  return NextResponse.json(data);
}

// Gast-Eintrag eines Treffens entfernen (nur ohne Kiosk-Unterschrift, z.B. Fehleingabe).
export async function DELETE(req: NextRequest) {
  if (!verifyPin(req)) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const { attendance_id } = await req.json();
  if (!attendance_id) {
    return NextResponse.json({ error: "attendance_id fehlt" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase
    .from("guest_attendance")
    .select("*")
    .eq("id", attendance_id)
    .maybeSingle();
  if (!existing) {
    return NextResponse.json({ error: "Eintrag nicht gefunden" }, { status: 404 });
  }
  if (existing.signature_data) {
    return NextResponse.json(
      { error: "Gast hat am Kiosk unterschrieben – Eintrag nicht löschbar" },
      { status: 409 }
    );
  }

  const { error } = await supabase.from("guest_attendance").delete().eq("id", attendance_id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (existing.admin_checked_in) {
    await bumpVisits(supabase, existing.guest_id, -1);
  }
  return NextResponse.json({ ok: true });
}

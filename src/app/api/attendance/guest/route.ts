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
  const {
    meeting_id,
    guest_id,
    signature_data,
    breakfast_paid,
    disclaimer_accepted,
    disclaimer_accepted_at,
  } = body;

  if (!meeting_id || !guest_id) {
    return NextResponse.json({ error: "Pflichtfelder fehlen" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // Gast-Anwesenheit erfassen
  const { data, error } = await supabase
    .from("guest_attendance")
    .insert({
      meeting_id,
      guest_id,
      signature_data: signature_data || null,
      breakfast_paid: breakfast_paid || false,
      disclaimer_accepted: disclaimer_accepted || false,
      disclaimer_accepted_at: disclaimer_accepted_at || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // total_visits hochzählen
  const { data: guest } = await supabase
    .from("guests")
    .select("total_visits")
    .eq("id", guest_id)
    .single();

  if (guest) {
    await supabase
      .from("guests")
      .update({ total_visits: (guest.total_visits || 0) + 1 })
      .eq("id", guest_id);
  }

  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const allowed = await verifyKioskAccess(req);
  if (!allowed) {
    return NextResponse.json(
      { error: "Kein Kiosk-Zugriff. Bitte das autorisierte Gerät verwenden." },
      { status: 403 }
    );
  }

  const body = await req.json();
  const {
    attendance_id,
    signature_data,
    breakfast_paid,
    disclaimer_accepted,
    disclaimer_accepted_at,
  } = body;

  if (!attendance_id) {
    return NextResponse.json({ error: "attendance_id fehlt" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("guest_attendance")
    .update({
      signature_data: signature_data || null,
      breakfast_paid: breakfast_paid || false,
      disclaimer_accepted: disclaimer_accepted || false,
      disclaimer_accepted_at: disclaimer_accepted_at || null,
    })
    .eq("id", attendance_id)
    .select("*, guest:guests(*)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // total_visits hochzählen
  if (data?.guest_id) {
    const { data: guest } = await supabase
      .from("guests")
      .select("total_visits")
      .eq("id", data.guest_id)
      .single();

    if (guest) {
      await supabase
        .from("guests")
        .update({ total_visits: (guest.total_visits || 0) + 1 })
        .eq("id", data.guest_id);
    }
  }

  return NextResponse.json(data);
}

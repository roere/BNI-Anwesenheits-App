import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import type { AttendanceStatus } from "@/lib/types";

function verifyPin(req: NextRequest): boolean {
  const pin = req.headers.get("X-Admin-PIN");
  return pin === (process.env.ADMIN_PIN || "1234");
}

const ALLOWED_STATUS: AttendanceStatus[] = [
  "PRESENT",
  "LATE",
  "REPRESENTED",
  "MEDICAL_ABSENT",
  "ABSENT",
];

// Korrigiert nachträglich den Anwesenheits-Status eines Mitglieds für ein
// (auch vergangenes) Treffen aus der Admin-Übersicht heraus.
export async function POST(req: NextRequest) {
  if (!verifyPin(req)) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const { attendance_id, status, represented_by } = await req.json();

  if (!attendance_id || !status) {
    return NextResponse.json(
      { error: "attendance_id und status sind erforderlich" },
      { status: 400 }
    );
  }
  if (!ALLOWED_STATUS.includes(status)) {
    return NextResponse.json({ error: "Ungültiger Status" }, { status: 400 });
  }
  if (status === "REPRESENTED" && !represented_by?.trim()) {
    return NextResponse.json(
      { error: "Bei Vertretung ist ein Name erforderlich" },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("member_attendance")
    .update({
      status,
      // Vertreter-Name nur bei REPRESENTED behalten, sonst leeren
      represented_by: status === "REPRESENTED" ? represented_by.trim() : null,
    })
    .eq("id", attendance_id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

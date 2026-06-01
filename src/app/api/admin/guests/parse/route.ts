import { NextRequest, NextResponse } from "next/server";
import { parseBesucherliste } from "@/lib/parse-besucherliste";

export const runtime = "nodejs";

function verifyPin(req: NextRequest): boolean {
  const pin = req.headers.get("X-Admin-PIN");
  return pin === (process.env.ADMIN_PIN || "1234");
}

export async function POST(req: NextRequest) {
  if (!verifyPin(req)) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  let file: File | null = null;
  try {
    const formData = await req.formData();
    file = formData.get("file") as File | null;
  } catch {
    return NextResponse.json({ error: "Datei konnte nicht gelesen werden" }, { status: 400 });
  }

  if (!file) {
    return NextResponse.json({ error: "Keine PDF-Datei übergeben" }, { status: 400 });
  }

  try {
    const data = new Uint8Array(await file.arrayBuffer());
    const result = await parseBesucherliste(data);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unbekannter Fehler";
    return NextResponse.json(
      { error: `PDF konnte nicht ausgewertet werden: ${message}` },
      { status: 500 }
    );
  }
}

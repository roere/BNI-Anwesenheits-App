import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { pin } = await req.json();
  const adminPin = process.env.ADMIN_PIN || "1234";

  if (pin !== adminPin) {
    return NextResponse.json({ error: "Falscher PIN" }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}

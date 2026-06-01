import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import type { ParsedBesucherliste, ParsedBesucherEntry } from "@/lib/types";

// Spalten-Grenzen (x-Koordinaten in PDF-Punkten) der BNI-Besucher-/Vertreterliste.
// Ermittelt aus dem Standard-Formular (A4 quer, ~842 pt breit).
const COL = {
  bvMax: 75, // Besucher/Vertreter (B/V)
  nameMax: 160, // Vor- und Nachname
  phoneMax: 235, // Telefon
  emailMax: 420, // E-Mail
  berufMax: 575, // Berufsbezeichnung
  invitedMax: 665, // Eingeladen von / Vertreter für
};

interface TextItem {
  x: number;
  y: number;
  s: string;
}

function columnOf(x: number): keyof typeof cells | null {
  if (x < COL.bvMax) return "bv";
  if (x < COL.nameMax) return "name";
  if (x < COL.phoneMax) return "phone";
  if (x < COL.emailMax) return "email";
  if (x < COL.berufMax) return "beruf";
  if (x < COL.invitedMax) return "invited";
  return null; // Newsletter / Unterschrift ignorieren
}

// Nur zur Typ-Ableitung von columnOf
const cells = { bv: "", name: "", phone: "", email: "", beruf: "", invited: "" };
type Cells = typeof cells;

function isRepresentativeCode(codePart: string): boolean {
  // "V" als eigenes Token im B/V-Code (z.B. "V", "B+V", "BNI+V")
  return /(?:^|[+\s/])V(?:$|[+\s/])/i.test(codePart.trim());
}

function parseEventDate(items: TextItem[]): string | null {
  for (const it of items) {
    const m = /vom\s+(\d{2})\.(\d{2})\.(\d{4})/.exec(it.s);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  }
  return null;
}

export async function parseBesucherliste(
  data: Uint8Array
): Promise<ParsedBesucherliste> {
  const doc = await pdfjs.getDocument({
    data,
    isEvalSupported: false,
    useSystemFonts: true,
  }).promise;

  const entries: ParsedBesucherEntry[] = [];
  let eventDate: string | null = null;

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const items: TextItem[] = content.items
      // @ts-expect-error pdfjs TextItem hat str/transform
      .filter((i) => typeof i.str === "string" && i.str.trim())
      // @ts-expect-error
      .map((i) => ({ x: Math.round(i.transform[4]), y: Math.round(i.transform[5]), s: i.str.trim() }));

    if (!eventDate) eventDate = parseEventDate(items);

    // Fußzeile (Einwilligungstext) abschneiden: alles unterhalb davon ignorieren
    const footerYs = items
      .filter((i) => /^Einwilligung\b/i.test(i.s))
      .map((i) => i.y);
    const footerY = footerYs.length ? Math.max(...footerYs) : -Infinity;

    const dataItems = items.filter((i) => i.y > footerY);

    // In Zeilen gruppieren (gleiche y-Höhe), von oben nach unten
    const lineMap = new Map<number, TextItem[]>();
    for (const it of dataItems) {
      const key = it.y;
      if (!lineMap.has(key)) lineMap.set(key, []);
      lineMap.get(key)!.push(it);
    }
    const lines = [...lineMap.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([, arr]) => arr.sort((a, b) => a.x - b.x));

    // Datensätze: beginnen mit einer Zeile, deren B/V-Spalte mit "<n>." startet
    let current: Cells | null = null;
    const flush = () => {
      if (!current) return;
      const name = current.name.trim();
      if (name) {
        const codePart = current.bv.replace(/^\s*\d+\.?\s*/, "").trim();
        const invited = current.invited.trim();
        const repByColumn = /^Vertretung\s+f[üu]r\s*/i.exec(invited);
        const isRep = isRepresentativeCode(codePart) || !!repByColumn;
        const representedFor = repByColumn
          ? invited.replace(/^Vertretung\s+f[üu]r\s*/i, "").trim() || null
          : null;
        entries.push({
          name,
          firma: current.beruf.trim(),
          code: codePart || "B",
          type: isRep ? "representative" : "guest",
          representedFor,
        });
      }
      current = null;
    };

    for (const line of lines) {
      const bvItem = line.find((i) => columnOf(i.x) === "bv");
      const isRecordStart = !!bvItem && /^\s*\d+\./.test(bvItem.s);

      if (isRecordStart) {
        flush();
        current = { bv: "", name: "", phone: "", email: "", beruf: "", invited: "" };
      }
      if (!current) continue;

      for (const it of line) {
        const col = columnOf(it.x);
        if (!col) continue;
        current[col] = current[col] ? `${current[col]} ${it.s}` : it.s;
      }
    }
    flush();
  }

  return { eventDate, entries };
}

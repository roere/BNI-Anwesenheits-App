// Findet das am besten passende Mitglied zu einem (ggf. unsauberen) Namen
// aus der PDF-Liste ("Vertretung für …"). Gibt die Mitglieds-ID zurück
// oder "" wenn keine ausreichend gute Übereinstimmung gefunden wurde.

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // Diakritika entfernen
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchMemberId(
  name: string | null | undefined,
  members: { id: string; name: string }[]
): string {
  if (!name) return "";
  const target = normalize(name);
  if (!target) return "";
  const targetTokens = new Set(target.split(" ").filter(Boolean));

  let bestId = "";
  let bestScore = 0;

  for (const m of members) {
    const cand = normalize(m.name);
    if (!cand) continue;
    if (cand === target) return m.id; // exakte Übereinstimmung

    const candTokens = cand.split(" ").filter(Boolean);
    let shared = 0;
    for (const t of candTokens) {
      if (targetTokens.has(t)) shared++;
    }
    // Anteil gemeinsamer Namensbestandteile
    const score = shared / Math.max(targetTokens.size, candTokens.length);
    if (score > bestScore) {
      bestScore = score;
      bestId = m.id;
    }
  }

  // Mindestens ein gemeinsamer, eindeutiger Namensbestandteil (z.B. Nachname)
  return bestScore >= 0.5 ? bestId : "";
}

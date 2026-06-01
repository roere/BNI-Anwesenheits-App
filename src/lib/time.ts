// Zeitzonen-Helfer für Deutschland (Europe/Berlin, MEZ/MESZ).
// Die Intl-API nutzt die IANA-Zeitzonendatenbank inkl. Sommer-/Winterzeit-Regeln,
// daher wird die Umstellung MEZ <-> MESZ automatisch korrekt behandelt.

const BERLIN_TZ = "Europe/Berlin";

/**
 * Aktuelle Uhrzeit in Europe/Berlin als Minuten seit Mitternacht (0–1439).
 */
export function getBerlinMinutesNow(): number {
  const parts = new Intl.DateTimeFormat("de-DE", {
    timeZone: BERLIN_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

/**
 * Wandelt einen "HH:MM"-String in Minuten seit Mitternacht um.
 * Gibt null zurück, wenn das Format ungültig ist.
 */
export function parseTimeToMinutes(time: string | null | undefined): number | null {
  if (!time) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return hour * 60 + minute;
}

/**
 * Formatiert einen ISO-Zeitstempel als Uhrzeit "HH:MM" in Europe/Berlin.
 */
export function formatBerlinTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: BERLIN_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

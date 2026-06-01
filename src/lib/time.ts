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
 * Wochentagsnamen, indexiert wie Date.getDay() / getWeekday() (0=Sonntag .. 6=Samstag).
 */
export const WEEKDAY_NAMES = [
  "Sonntag",
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
];

/**
 * Heutiges Datum als "yyyy-mm-dd" in Europe/Berlin.
 */
export function getBerlinTodayISO(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BERLIN_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")?.value ?? "1970";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${y}-${m}-${d}`;
}

/**
 * Wochentag eines "yyyy-mm-dd"-Datums als Zahl (0=Sonntag .. 6=Samstag).
 * Das Datum wird als reines Kalenderdatum (ohne Zeitzonenversatz über UTC) interpretiert.
 */
export function getWeekday(isoDate: string): number {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/**
 * Verschiebt ein "yyyy-mm-dd"-Datum um die angegebene Anzahl Tage.
 */
export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().split("T")[0];
}

/**
 * Datum des letzten Treffens: jüngstes Vorkommen des Wochentags am oder vor "todayISO".
 * Ist heute der Treffen-Tag, wird das heutige Datum zurückgegeben.
 */
export function lastMeetingDate(todayISO: string, weekday: number): string {
  const diff = (getWeekday(todayISO) - weekday + 7) % 7;
  return addDays(todayISO, -diff);
}

/**
 * Datum des nächsten Treffens: nächstes Vorkommen des Wochentags am oder nach "todayISO".
 * Ist heute der Treffen-Tag, wird das heutige Datum zurückgegeben.
 */
export function nextMeetingDate(todayISO: string, weekday: number): string {
  const diff = (weekday - getWeekday(todayISO) + 7) % 7;
  return addDays(todayISO, diff);
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

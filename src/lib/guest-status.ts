import type { GuestAttendance } from "./types";

/**
 * Gilt ein Gast für ein Treffen als anwesend? Entweder hat er am Kiosk
 * unterschrieben oder er wurde im Admin nachträglich als anwesend eingetragen.
 */
export function isGuestCheckedIn(
  ga: Pick<GuestAttendance, "signature_data" | "admin_checked_in">
): boolean {
  return !!ga.signature_data || ga.admin_checked_in === true;
}

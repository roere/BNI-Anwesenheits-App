import type { Member, MemberAttendance } from "./types";

export type AttendanceRow = {
  member: Member;
  // undefined = für dieses Treffen noch nicht erfasst
  attendance?: MemberAttendance;
};

/**
 * Führt die aktiven Mitglieder mit den vorhandenen Anwesenheits-Einträgen eines
 * Treffens zusammen. Mitglieder ohne Eintrag erscheinen als "nicht erfasst",
 * damit sie im Admin nachträglich erfasst werden können. Einträge von
 * inzwischen inaktiven Mitgliedern bleiben sichtbar.
 */
export function buildAttendanceRows(
  activeMembers: Member[],
  attendances: (MemberAttendance & { member?: Member | null })[]
): AttendanceRow[] {
  const byMember = new Map(attendances.map((a) => [a.member_id, a]));
  const rows: AttendanceRow[] = activeMembers.map((m) => ({
    member: m,
    attendance: byMember.get(m.id),
  }));

  const activeIds = new Set(activeMembers.map((m) => m.id));
  for (const a of attendances) {
    if (!activeIds.has(a.member_id) && a.member) {
      rows.push({ member: a.member, attendance: a });
    }
  }

  return rows.sort((x, y) => x.member.name.localeCompare(y.member.name, "de"));
}

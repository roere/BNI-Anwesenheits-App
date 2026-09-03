import { test } from "node:test";
import assert from "node:assert/strict";
import { buildAttendanceRows } from "./attendance-rows.ts";

const member = (id: string, name: string, active = true) => ({
  id,
  name,
  fachgebiet: "",
  active,
  created_at: "",
});

const att = (id: string, member_id: string) => ({
  id,
  meeting_id: "m1",
  member_id,
  status: "PRESENT" as const,
  represented_by: null,
  signature_data: null,
  disclaimer_accepted: false,
  disclaimer_accepted_at: null,
  created_at: "",
});

test("aktive Mitglieder ohne Eintrag erscheinen als nicht erfasst", () => {
  const rows = buildAttendanceRows(
    [member("a", "Anna"), member("b", "Bernd")],
    [att("x", "a")]
  );
  assert.deepEqual(
    rows.map((r) => [r.member.name, r.attendance?.id ?? null]),
    [
      ["Anna", "x"],
      ["Bernd", null],
    ]
  );
});

test("Einträge inaktiver oder gelöschter Mitglieder bleiben sichtbar", () => {
  const rows = buildAttendanceRows(
    [member("a", "Anna")],
    [{ ...att("y", "z"), member: member("z", "Zoe", false) }]
  );
  assert.deepEqual(
    rows.map((r) => [r.member.name, r.attendance?.id ?? null]),
    [
      ["Anna", null],
      ["Zoe", "y"],
    ]
  );
});

test("Zeilen sind alphabetisch nach Name sortiert", () => {
  const rows = buildAttendanceRows(
    [member("b", "Bernd"), member("a", "Anna")],
    []
  );
  assert.deepEqual(rows.map((r) => r.member.name), ["Anna", "Bernd"]);
});

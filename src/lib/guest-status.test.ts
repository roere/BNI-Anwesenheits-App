import { test } from "node:test";
import assert from "node:assert/strict";
import { isGuestCheckedIn } from "./guest-status.ts";

test("Unterschrift am Kiosk zählt als eingecheckt", () => {
  assert.equal(isGuestCheckedIn({ signature_data: "data:...", admin_checked_in: false }), true);
});

test("nachträglicher Admin-Eintrag zählt als eingecheckt", () => {
  assert.equal(isGuestCheckedIn({ signature_data: null, admin_checked_in: true }), true);
});

test("vorausgefüllter Gast ohne beides ist nicht eingecheckt", () => {
  assert.equal(isGuestCheckedIn({ signature_data: null, admin_checked_in: false }), false);
  // Alte Datensätze ohne Spalte (undefined) ebenfalls nicht
  assert.equal(
    isGuestCheckedIn({ signature_data: null } as { signature_data: null; admin_checked_in: boolean }),
    false
  );
});

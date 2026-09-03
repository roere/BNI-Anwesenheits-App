-- BNI Anwesenheits-App: Gäste im Admin nachträglich als anwesend eintragen
-- (ohne Unterschrift am Kiosk). Idempotent – kann gefahrlos auf der Live-DB
-- ausgeführt werden.

ALTER TABLE guest_attendance
  ADD COLUMN IF NOT EXISTS admin_checked_in BOOLEAN NOT NULL DEFAULT false;

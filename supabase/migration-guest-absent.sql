-- BNI Anwesenheits-App: Gäste auf "abwesend" setzen können
-- Idempotent – kann gefahrlos auf der Live-DB ausgeführt werden.

ALTER TABLE guest_attendance
  ADD COLUMN IF NOT EXISTS absent BOOLEAN NOT NULL DEFAULT false;

-- BNI Anwesenheits-App: Update für neue Status + "zu spät"-Erkennung
-- Idempotent – kann gefahrlos auf der Live-DB ausgeführt werden.
-- Mitglieder-Seeds werden NICHT angefasst.

-- 1) CHECK-Constraint um die neuen Status erweitern
--    ('LATE' = zu spät, 'MEDICAL_ABSENT' = medizinisch abwesend)
ALTER TABLE member_attendance DROP CONSTRAINT IF EXISTS member_attendance_status_check;
ALTER TABLE member_attendance
  ADD CONSTRAINT member_attendance_status_check
  CHECK (status IN ('PRESENT', 'REPRESENTED', 'ABSENT', 'LATE', 'MEDICAL_ABSENT'));

-- 2) Einstellungen für die automatische "zu spät"-Erkennung
--    (Uhrzeit gilt für Europe/Berlin / MEZ-MESZ)
INSERT INTO settings (key, value) VALUES
  ('late_threshold_enabled', 'false'),
  ('late_threshold_time', '07:00')
ON CONFLICT (key) DO NOTHING;

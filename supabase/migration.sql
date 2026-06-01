-- BNI Anwesenheits-App: Datenbank-Schema

-- Mitglieder
CREATE TABLE IF NOT EXISTS members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  fachgebiet TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Gäste
CREATE TABLE IF NOT EXISTS guests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  firma TEXT,
  total_visits INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Meetings (wöchentliche Treffen)
CREATE TABLE IF NOT EXISTS meetings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Mitglieder-Anwesenheit
CREATE TABLE IF NOT EXISTS member_attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('PRESENT', 'REPRESENTED', 'ABSENT', 'LATE', 'MEDICAL_ABSENT')),
  represented_by TEXT,
  signature_data TEXT,
  disclaimer_accepted BOOLEAN NOT NULL DEFAULT false,
  disclaimer_accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(meeting_id, member_id)
);

-- Gäste-Anwesenheit
CREATE TABLE IF NOT EXISTS guest_attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  signature_data TEXT,
  breakfast_paid BOOLEAN NOT NULL DEFAULT false,
  absent BOOLEAN NOT NULL DEFAULT false,
  disclaimer_accepted BOOLEAN NOT NULL DEFAULT false,
  disclaimer_accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(meeting_id, guest_id)
);

-- Einstellungen (z.B. Disclaimer-Text)
CREATE TABLE IF NOT EXISTS settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL
);

-- Disclaimer-Text initial einfügen
INSERT INTO settings (key, value) VALUES (
  'disclaimer_text',
  'Erklärung für die Teilnahme am Chaptertreffen:
Hiermit versichere ich ausdrücklich, dass ich keine Symptome einer Covid-19-Erkrankung bzw. einer Infektion mit dem Coronavirus verspüre (z.B.: trockener Husten, Fieber, Atemprobleme, Abgeschlagenheit, Halskatzen, Kopf- und Gliederschmerzen, Übelkeit, Durchfall, Schnupfen oder Schüttelfrost, Verlust des Geruch- oder Geschmackssinns) und auch sonst keine Kenntnis einer ansteckenden Krankheit bei mir habe, die durch bloße Berührung oder die Atemwege übertragbar ist, und nach meiner Kenntnis innerhalb der letzten 14 Tage keinen persönlichen Kontakt mit einer Corona-infizierten Person oder einer Person, die unter behördlich angeordneter Quarantäne steht, hatte.
Mit der Teilnahme an diesem Treffen verpflichten Sie sich zur Einhaltung aller gesetzlich erforderlichen Regeln (z.B.: Mindestabstand, Mundschutz) sowie zur eigenverantwortlichen Einhaltung aller sonst möglichen Schutz- und Hygienemaßnahmen gegenüber anderen Teilnehmern, dies sind z.B.: kein Händeschütteln, keine Umarmungen, keine Berührungen, keine Teilnahme bei Verdacht auf eine Erkrankung, Meldung von Verdachtsfällen auch im Nachhinein, gründliche Händehygiene & Desinfektion.'
) ON CONFLICT (key) DO NOTHING;

-- Gäste-/Vertreter-Disclaimer initial mit dem Mitglieder-Text vorbelegen
INSERT INTO settings (key, value)
SELECT 'disclaimer_text_guests', value FROM settings WHERE key = 'disclaimer_text'
ON CONFLICT (key) DO NOTHING;

-- Automatische "zu spät"-Erkennung (ab Uhrzeit, Europe/Berlin / MEZ-MESZ)
INSERT INTO settings (key, value) VALUES
  ('late_threshold_enabled', 'false'),
  ('late_threshold_time', '07:00')
ON CONFLICT (key) DO NOTHING;

-- Treffen-Wochentag (0=Sonntag .. 6=Samstag, wie Date.getDay()). Default: Freitag (5).
INSERT INTO settings (key, value) VALUES
  ('meeting_weekday', '5')
ON CONFLICT (key) DO NOTHING;

-- Bestehende Datenbanken: CHECK-Constraint um die neuen Status erweitern.
-- (CREATE TABLE IF NOT EXISTS legt den Constraint bei vorhandener Tabelle nicht neu an.)
ALTER TABLE member_attendance DROP CONSTRAINT IF EXISTS member_attendance_status_check;
ALTER TABLE member_attendance
  ADD CONSTRAINT member_attendance_status_check
  CHECK (status IN ('PRESENT', 'REPRESENTED', 'ABSENT', 'LATE', 'MEDICAL_ABSENT'));

-- Seed: Mitglieder aus der PDF-Liste
INSERT INTO members (name, fachgebiet) VALUES
  ('Tino Müllenbach', ''),
  ('Daniel Grundahl', 'Bandkunst'),
  ('Dirk Dols', 'Dachdecker'),
  ('Dirk Hawe', 'Elektro + PV'),
  ('Jörg Benchop', 'IT'),
  ('Henrik Müller', ''),
  ('Joris Keyen', 'Versicherung'),
  ('Reiko Pedersen', 'Psychotherapie'),
  ('Simon Leith', 'Insi. Hz. & San.'),
  ('Franca Gianni', 'Wrecht'),
  ('Max von Gars', 'Facturing'),
  ('Alexander Jahnke', ''),
  ('Dennis Schod', ''),
  ('Tristan Low', ''),
  ('D. Lorenzo', 'Entrümpelung'),
  ('L. Niedereck', 'Print');

-- Indices für Performance
CREATE INDEX IF NOT EXISTS idx_member_attendance_meeting ON member_attendance(meeting_id);
CREATE INDEX IF NOT EXISTS idx_member_attendance_member ON member_attendance(member_id);
CREATE INDEX IF NOT EXISTS idx_guest_attendance_meeting ON guest_attendance(meeting_id);
CREATE INDEX IF NOT EXISTS idx_guest_attendance_guest ON guest_attendance(guest_id);
CREATE INDEX IF NOT EXISTS idx_meetings_date ON meetings(date);

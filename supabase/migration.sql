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
  status TEXT NOT NULL CHECK (status IN ('PRESENT', 'REPRESENTED', 'ABSENT')),
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

-- Seed: Mitglieder aus BNI Königsforst (Overath)
INSERT INTO members (name, fachgebiet) VALUES
  ('Daniel Crnadak', 'Rolladen- und Markisenbau'),
  ('Dirk Dahs', 'Dachdeckerei'),
  ('Emanuel Piasula', 'Malerei und Lackiererei'),
  ('Fetaji Qani', 'Autopflege-Reparatur'),
  ('Franco Giannini', 'Finanzen & Versicherungen'),
  ('Hendrik Müller', 'Metallbau'),
  ('Jörg Julius Kapune', 'Tischlerei / Schreinerei'),
  ('Jörg-Bernd Bonekamp', 'IT- und Netzwerktechnik'),
  ('Katharina Kolzem', 'Immobilienverwaltung'),
  ('Leon Nedieck', 'Webdesign'),
  ('Lucas Clever', 'Autoservice'),
  ('Marc Dahs', 'Dachdeckerei'),
  ('Marco Korbach', 'Versicherungsvertretung'),
  ('Max van Laer', 'Finanzierungsvermittlung'),
  ('Michele Di Lorenzo', 'Abbrucharbeiten'),
  ('Oliver Zgunea', 'Versicherungsvermittlung'),
  ('René Roderstein', 'Gesundheit & Wellness'),
  ('Sebastian Winter', 'Werbung & Marketing'),
  ('Simon Lehn', 'Sanitär- und Heizungsinstallation'),
  ('Slobodan Zlatanovic', 'Fitness- und Wellnesseinrichtungen'),
  ('Tino Müllenbach', 'Lebensmittelherstellung');

-- Indices für Performance
CREATE INDEX IF NOT EXISTS idx_member_attendance_meeting ON member_attendance(meeting_id);
CREATE INDEX IF NOT EXISTS idx_member_attendance_member ON member_attendance(member_id);
CREATE INDEX IF NOT EXISTS idx_guest_attendance_meeting ON guest_attendance(meeting_id);
CREATE INDEX IF NOT EXISTS idx_guest_attendance_guest ON guest_attendance(guest_id);
CREATE INDEX IF NOT EXISTS idx_meetings_date ON meetings(date);

-- ==================== RLS-Policies ====================

-- Members: Anon darf nur lesen, Schreibzugriff über service_role (Admin-API)
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Mitglieder lesen" ON members FOR SELECT TO anon USING (true);

-- Guests: Anon darf lesen, erstellen und aktualisieren (Check-in-Flow)
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gäste lesen" ON guests FOR SELECT TO anon USING (true);
CREATE POLICY "Gäste erstellen" ON guests FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Gäste aktualisieren" ON guests FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Meetings: Anon darf lesen und erstellen (Auto-Erstellung)
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Meetings lesen" ON meetings FOR SELECT TO anon USING (true);
CREATE POLICY "Meetings erstellen" ON meetings FOR INSERT TO anon WITH CHECK (true);

-- Member Attendance: Anon darf lesen, erfassen und zurücksetzen
ALTER TABLE member_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anwesenheit lesen" ON member_attendance FOR SELECT TO anon USING (true);
CREATE POLICY "Anwesenheit erfassen" ON member_attendance FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anwesenheit zurücksetzen" ON member_attendance FOR DELETE TO anon USING (true);

-- Guest Attendance: Anon darf lesen und erfassen
ALTER TABLE guest_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gast-Anwesenheit lesen" ON guest_attendance FOR SELECT TO anon USING (true);
CREATE POLICY "Gast-Anwesenheit erfassen" ON guest_attendance FOR INSERT TO anon WITH CHECK (true);

-- Settings: Anon darf nur lesen, Bearbeiten über service_role (Admin-API)
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Einstellungen lesen" ON settings FOR SELECT TO anon USING (true);

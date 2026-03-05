-- =====================================================
-- RLS-Policies für BNI Anwesenheits-App
-- Ausführen im Supabase SQL-Editor
-- =====================================================

-- ==================== MEMBERS ====================
-- Anon darf nur lesen (Check-in-Seite braucht Mitgliederliste)
-- Erstellen/Bearbeiten nur über Admin-API (service_role)
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mitglieder lesen" ON members
  FOR SELECT TO anon USING (true);

-- ==================== GUESTS ====================
-- Anon darf lesen, erstellen und Besuchszähler aktualisieren
-- (Check-in: neuer Gast hinzufügen, Besuchszähler hochzählen)
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gäste lesen" ON guests
  FOR SELECT TO anon USING (true);

CREATE POLICY "Gäste erstellen" ON guests
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Gäste aktualisieren" ON guests
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- ==================== MEETINGS ====================
-- Anon darf lesen und erstellen (Auto-Erstellung für heutiges Datum)
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Meetings lesen" ON meetings
  FOR SELECT TO anon USING (true);

CREATE POLICY "Meetings erstellen" ON meetings
  FOR INSERT TO anon WITH CHECK (true);

-- ==================== MEMBER_ATTENDANCE ====================
-- Anon darf lesen, erfassen und zurücksetzen (Doppelklick-Reset)
ALTER TABLE member_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anwesenheit lesen" ON member_attendance
  FOR SELECT TO anon USING (true);

CREATE POLICY "Anwesenheit erfassen" ON member_attendance
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anwesenheit zurücksetzen" ON member_attendance
  FOR DELETE TO anon USING (true);

-- ==================== GUEST_ATTENDANCE ====================
-- Anon darf lesen und erfassen
ALTER TABLE guest_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gast-Anwesenheit lesen" ON guest_attendance
  FOR SELECT TO anon USING (true);

CREATE POLICY "Gast-Anwesenheit erfassen" ON guest_attendance
  FOR INSERT TO anon WITH CHECK (true);

-- ==================== SETTINGS ====================
-- Anon darf nur lesen (Disclaimer-Text für Check-in)
-- Bearbeiten nur über Admin-API (service_role)
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Einstellungen lesen" ON settings
  FOR SELECT TO anon USING (true);

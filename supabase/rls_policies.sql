-- =====================================================
-- RLS-Policies für BNI Anwesenheits-App
-- Ausführen im Supabase SQL-Editor
-- =====================================================
-- HINWEIS: Nach Kiosk-Modus Migration haben alle Tabellen
-- nur noch SELECT-Rechte für anon. Alle Schreibzugriffe
-- laufen über API-Routes mit service_role.
-- Siehe: migration_kiosk.sql
-- =====================================================

-- ==================== MEMBERS ====================
-- Anon darf nur lesen (Check-in-Seite braucht Mitgliederliste)
-- Erstellen/Bearbeiten nur über Admin-API (service_role)
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mitglieder lesen" ON members
  FOR SELECT TO anon USING (true);

-- ==================== GUESTS ====================
-- Anon darf nur lesen (Autocomplete auf Check-in-Seite)
-- Erstellen/Aktualisieren über API-Routes (service_role)
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gäste lesen" ON guests
  FOR SELECT TO anon USING (true);

-- ==================== MEETINGS ====================
-- Anon darf nur lesen (heutiges Meeting anzeigen)
-- Erstellen über API-Routes (service_role)
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Meetings lesen" ON meetings
  FOR SELECT TO anon USING (true);

-- ==================== MEMBER_ATTENDANCE ====================
-- Anon darf nur lesen (Anwesenheitsstatus anzeigen)
-- Erfassen/Zurücksetzen über API-Routes (service_role)
ALTER TABLE member_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anwesenheit lesen" ON member_attendance
  FOR SELECT TO anon USING (true);

-- ==================== GUEST_ATTENDANCE ====================
-- Anon darf nur lesen (Gäste-Anwesenheit anzeigen)
-- Erfassen über API-Routes (service_role)
ALTER TABLE guest_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gast-Anwesenheit lesen" ON guest_attendance
  FOR SELECT TO anon USING (true);

-- ==================== SETTINGS ====================
-- Anon darf nur lesen (Disclaimer-Text, Kiosk-Status)
-- Bearbeiten nur über Admin-API (service_role)
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Einstellungen lesen" ON settings
  FOR SELECT TO anon USING (true);

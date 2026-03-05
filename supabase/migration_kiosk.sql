-- =====================================================
-- Kiosk-Modus Migration
-- Entfernt Anon-Schreibrechte auf Attendance-Tabellen
-- Alle Schreibzugriffe laufen nun über API-Routes (service_role)
-- =====================================================
-- WICHTIG: Diese Migration erst ausführen, wenn die neuen
-- API-Routes deployed sind! Sonst funktioniert die App nicht.
-- =====================================================

-- ==================== MEMBER_ATTENDANCE ====================
-- Anon darf nur noch lesen (kein INSERT/DELETE mehr)
DROP POLICY IF EXISTS "Anwesenheit erfassen" ON member_attendance;
DROP POLICY IF EXISTS "Anwesenheit zurücksetzen" ON member_attendance;

-- ==================== GUEST_ATTENDANCE ====================
-- Anon darf nur noch lesen (kein INSERT mehr)
DROP POLICY IF EXISTS "Gast-Anwesenheit erfassen" ON guest_attendance;

-- ==================== GUESTS ====================
-- Anon darf nur noch lesen (kein INSERT/UPDATE mehr)
DROP POLICY IF EXISTS "Gäste erstellen" ON guests;
DROP POLICY IF EXISTS "Gäste aktualisieren" ON guests;

-- ==================== MEETINGS ====================
-- Anon darf nur noch lesen (kein INSERT mehr)
DROP POLICY IF EXISTS "Meetings erstellen" ON meetings;

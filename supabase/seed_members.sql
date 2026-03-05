-- BNI Königsforst (Overath) - Mitglieder neu setzen
-- Achtung: Löscht ALLE vorhandenen Mitglieder und deren Anwesenheitsdaten!

-- Zuerst Anwesenheitsdaten löschen (Fremdschlüssel)
DELETE FROM member_attendance;

-- Alle vorhandenen Mitglieder löschen
DELETE FROM members;

-- Mitglieder aus Screenshot einfügen
INSERT INTO members (name, fachgebiet) VALUES
  ('Daniel Crnadak', 'Holzladen- und Markisenbau'),
  ('Dirk Dahs', 'Dachdeckerei'),
  ('Emanuel Pissula', 'Malerei und Lackiererei'),
  ('Fetaji Qani', 'Autoglas-Reparatur'),
  ('Franco Giannini', 'Finanzen & Versicherungen'),
  ('Hendrik Müller', 'Metallbau'),
  ('Jörg Julius Kapune', 'Tischlerei / Schreinerei'),
  ('Jörg-Bernd Bonekamp', 'IT- und Netzwerktechnik'),
  ('Katharina Kolzem', 'Immobilienvermittlung'),
  ('Leon Niedieck', 'Werbetechnik'),
  ('Lucas Clever', 'Autohandel'),
  ('Marc Dahs', 'Elektroinstallation'),
  ('Marco Korbach', 'Versicherungsvermittlung'),
  ('Max van Laer', 'Factoringberatung'),
  ('Michele Di Lorenzo', 'Abbrucharbeiten'),
  ('Oliver Zgunea', 'Versicherungsvermittlung'),
  ('René Röderstein', 'Heilpraktiker'),
  ('Sebastian Winter', 'Werbung & Marketing'),
  ('Simon Lehn', 'Sanitär- und Heizungsinstallation'),
  ('Slobodan Zlatanovic', 'Stress- und Gesundheitsberatung'),
  ('Tino Müllenbach', 'Lebensmittelherstellung');

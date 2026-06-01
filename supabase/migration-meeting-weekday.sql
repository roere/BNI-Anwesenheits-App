-- Treffen-Wochentag: an welchem Wochentag die wöchentlichen Treffen stattfinden.
-- Werte wie Date.getDay(): 0=Sonntag, 1=Montag, ... 5=Freitag, 6=Samstag.
-- Default: Freitag (5).
INSERT INTO settings (key, value) VALUES ('meeting_weekday', '5')
ON CONFLICT (key) DO NOTHING;

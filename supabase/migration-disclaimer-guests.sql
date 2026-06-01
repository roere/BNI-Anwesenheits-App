-- BNI Anwesenheits-App: Getrennter Disclaimer für Gäste & Vertreter
-- Idempotent – kann gefahrlos auf der Live-DB ausgeführt werden.

-- Legt den Gäste-/Vertreter-Disclaimer an und übernimmt als Startwert
-- den bestehenden Mitglieder-Disclaimer. Bereits vorhandener Wert bleibt erhalten.
INSERT INTO settings (key, value)
SELECT 'disclaimer_text_guests', value FROM settings WHERE key = 'disclaimer_text'
ON CONFLICT (key) DO NOTHING;

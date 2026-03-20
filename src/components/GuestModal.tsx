"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { Guest } from "@/lib/types";

interface GuestModalProps {
  meetingId: string;
  onGuestAdded: (guest: Guest) => void;
  onClose: () => void;
}

export default function GuestModal({ meetingId, onGuestAdded, onClose }: GuestModalProps) {
  const [name, setName] = useState("");
  const [firma, setFirma] = useState("");
  const [existingGuests, setExistingGuests] = useState<Guest[]>([]);
  const [suggestions, setSuggestions] = useState<Guest[]>([]);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);

  useEffect(() => {
    const loadGuests = async () => {
      const { data } = await supabase
        .from("guests")
        .select("*")
        .order("name");
      if (data) setExistingGuests(data);
    };
    loadGuests();
  }, []);

  useEffect(() => {
    if (name.length >= 2) {
      const filtered = existingGuests.filter((g) =>
        g.name.toLowerCase().includes(name.toLowerCase())
      );
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  }, [name, existingGuests]);

  const handleSelectExisting = (guest: Guest) => {
    setSelectedGuest(guest);
    setName(guest.name);
    setFirma(guest.firma || "");
    setSuggestions([]);
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;

    if (selectedGuest) {
      onGuestAdded(selectedGuest);
      return;
    }

    // Neuen Gast über API erstellen
    try {
      const { kioskFetch } = await import("@/lib/kiosk-api");
      const newGuest = await kioskFetch<Guest>("/api/attendance/guest/create", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          firma: firma.trim() || null,
        }),
      });
      if (newGuest) {
        onGuestAdded(newGuest);
      }
    } catch {
      // Fehler beim Erstellen
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6 border-b">
          <h2 className="text-xl sm:text-2xl font-bold text-bni-gray">Gast hinzufügen</h2>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          <div className="relative">
            <label className="block text-sm font-semibold text-bni-gray mb-1">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSelectedGuest(null);
              }}
              placeholder="Name des Gastes"
              className="w-full p-3 sm:p-4 rounded-xl border-2 border-gray-300 text-base sm:text-lg focus:border-bni-red focus:outline-none"
            />
            {/* Autocomplete-Vorschläge */}
            {suggestions.length > 0 && !selectedGuest && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-gray-200 rounded-xl shadow-lg overflow-hidden z-10 max-h-48 overflow-y-auto">
                {suggestions.map((guest) => (
                  <button
                    key={guest.id}
                    onClick={() => handleSelectExisting(guest)}
                    className="w-full p-3 text-left hover:bg-gray-50 border-b last:border-b-0"
                  >
                    <p className="font-semibold text-sm sm:text-base truncate">{guest.name}</p>
                    <p className="text-xs sm:text-sm text-bni-gray opacity-70 truncate">
                      {guest.firma && `${guest.firma} · `}
                      {guest.total_visits} Besuch
                      {guest.total_visits !== 1 ? "e" : ""}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-bni-gray mb-1">
              Firma (optional)
            </label>
            <input
              type="text"
              value={firma}
              onChange={(e) => setFirma(e.target.value)}
              placeholder="Firmenname"
              className="w-full p-3 sm:p-4 rounded-xl border-2 border-gray-300 text-base sm:text-lg focus:border-bni-red focus:outline-none"
              disabled={!!selectedGuest}
            />
          </div>

          {/* Info über Besuchsanzahl */}
          {selectedGuest && (
            <div
              className={`p-3 sm:p-4 rounded-xl border-2 ${
                selectedGuest.total_visits >= 1
                  ? "bg-yellow-50 border-yellow-400"
                  : "bg-blue-50 border-blue-400"
              }`}
            >
              <p className="font-semibold text-sm sm:text-base">
                {selectedGuest.total_visits >= 1
                  ? `${selectedGuest.total_visits + 1}. Besuch - Frühstück bitte bezahlen`
                  : `1. Besuch - Frühstück kostenlos`}
              </p>
            </div>
          )}

          {!selectedGuest && name.trim() && suggestions.length === 0 && (
            <div className="p-3 sm:p-4 rounded-xl bg-blue-50 border-2 border-blue-400">
              <p className="font-semibold text-sm sm:text-base">Neuer Gast - 1. Besuch - Frühstück kostenlos</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t space-y-3">
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="w-full p-3 sm:p-4 rounded-xl bg-bni-red text-white font-bold text-base sm:text-lg active:scale-95 transition-all disabled:opacity-50"
          >
            Weiter zur Unterschrift
          </button>
          <button
            onClick={onClose}
            className="w-full p-3 rounded-xl text-bni-gray font-medium hover:bg-gray-100 transition-colors text-sm sm:text-base"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
}

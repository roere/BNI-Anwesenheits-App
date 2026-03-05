"use client";

import { useState } from "react";
import type { Member, AttendanceStatus } from "@/lib/types";

interface StatusModalProps {
  member: Member;
  onSelect: (status: AttendanceStatus, representedBy?: string) => void;
  onClose: () => void;
}

export default function StatusModal({ member, onSelect, onClose }: StatusModalProps) {
  const [showRepresented, setShowRepresented] = useState(false);
  const [representedBy, setRepresentedBy] = useState("");

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold text-bni-gray">{member.name}</h2>
          {member.fachgebiet && (
            <p className="text-bni-gray opacity-70">{member.fachgebiet}</p>
          )}
        </div>

        <div className="p-6 space-y-3">
          {!showRepresented ? (
            <>
              <button
                onClick={() => onSelect("PRESENT")}
                className="w-full p-4 rounded-xl bg-green-500 text-white font-bold text-xl active:scale-95 transition-all"
              >
                Anwesend
              </button>

              <button
                onClick={() => setShowRepresented(true)}
                className="w-full p-4 rounded-xl bg-yellow-500 text-white font-bold text-xl active:scale-95 transition-all"
              >
                Vertreten durch...
              </button>

              <button
                onClick={() => onSelect("ABSENT")}
                className="w-full p-4 rounded-xl bg-red-500 text-white font-bold text-xl active:scale-95 transition-all"
              >
                Abwesend
              </button>
            </>
          ) : (
            <div className="space-y-4">
              <label className="block text-lg font-semibold text-bni-gray">
                Vertreten durch:
              </label>
              <input
                type="text"
                value={representedBy}
                onChange={(e) => setRepresentedBy(e.target.value)}
                placeholder="Name der Vertretung"
                className="w-full p-4 rounded-xl border-2 border-gray-300 text-lg focus:border-bni-red focus:outline-none"
                autoFocus
              />
              <button
                onClick={() => {
                  if (representedBy.trim()) {
                    onSelect("REPRESENTED", representedBy.trim());
                  }
                }}
                disabled={!representedBy.trim()}
                className="w-full p-4 rounded-xl bg-yellow-500 text-white font-bold text-xl active:scale-95 transition-all disabled:opacity-50"
              >
                Bestätigen
              </button>
              <button
                onClick={() => setShowRepresented(false)}
                className="w-full p-3 rounded-xl text-bni-gray font-medium"
              >
                Zurück
              </button>
            </div>
          )}
        </div>

        <div className="p-4 border-t">
          <button
            onClick={onClose}
            className="w-full p-3 rounded-xl text-bni-gray font-medium hover:bg-gray-100 transition-colors"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
}

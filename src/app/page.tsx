"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { kioskFetch, getKioskToken } from "@/lib/kiosk-api";
import type {
  Member,
  MemberAttendance,
  Meeting,
  AttendanceStatus,
  Guest,
  GuestAttendance,
  KioskValidateResponse,
} from "@/lib/types";
import StatusModal from "@/components/StatusModal";
import SignatureModal from "@/components/SignatureModal";
import GuestModal from "@/components/GuestModal";

type KioskMode = "loading" | "kiosk" | "readonly" | "open";

export default function CheckInPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [attendances, setAttendances] = useState<MemberAttendance[]>([]);
  const [guestAttendances, setGuestAttendances] = useState<
    (GuestAttendance & { guest: Guest })[]
  >([]);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [disclaimerText, setDisclaimerText] = useState("");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [signingGuest, setSigningGuest] = useState<Guest | null>(null);
  const [signingGuestAttendanceId, setSigningGuestAttendanceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [kioskMode, setKioskMode] = useState<KioskMode>("loading");
  const [resetMemberId, setResetMemberId] = useState<string | null>(null);
  const [resetPin, setResetPin] = useState("");
  const [resetError, setResetError] = useState("");

  const canWrite = kioskMode === "kiosk" || kioskMode === "open";

  const getTodayFriday = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  const validateKiosk = useCallback(async () => {
    try {
      const token = getKioskToken();
      const res = await fetch("/api/kiosk/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data: KioskValidateResponse = await res.json();
      setKioskMode(data.mode);
    } catch {
      // Bei Fehler: Open Mode (Rückwärtskompatibilität)
      setKioskMode("open");
    }
  }, []);

  const loadData = useCallback(async () => {
    const todayDate = getTodayFriday();

    // Meeting für heute laden
    let { data: meetingData } = await supabase
      .from("meetings")
      .select("*")
      .eq("date", todayDate)
      .single();

    // Meeting erstellen nur wenn schreibberechtigt
    if (!meetingData && canWrite) {
      try {
        const newMeeting = await kioskFetch<Meeting>("/api/attendance/meeting", {
          method: "POST",
          body: JSON.stringify({ date: todayDate }),
        });
        meetingData = newMeeting;
      } catch {
        // Meeting konnte nicht erstellt werden
      }
    }

    if (meetingData) {
      setMeeting(meetingData);

      // Mitglieder laden
      const { data: membersData } = await supabase
        .from("members")
        .select("*")
        .eq("active", true)
        .order("name");

      if (membersData) setMembers(membersData);

      // Anwesenheiten laden
      const { data: attendanceData } = await supabase
        .from("member_attendance")
        .select("*")
        .eq("meeting_id", meetingData.id);

      if (attendanceData) setAttendances(attendanceData);

      // Gäste-Anwesenheiten laden
      const { data: guestAttData } = await supabase
        .from("guest_attendance")
        .select("*, guest:guests(*)")
        .eq("meeting_id", meetingData.id);

      if (guestAttData) setGuestAttendances(guestAttData as any);
    }

    // Disclaimer laden
    const { data: settingsData } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "disclaimer_text")
      .single();

    if (settingsData) setDisclaimerText(settingsData.value);

    setLoading(false);
  }, [canWrite]);

  useEffect(() => {
    validateKiosk();
  }, [validateKiosk]);

  useEffect(() => {
    if (kioskMode !== "loading") {
      loadData();
    }
  }, [kioskMode, loadData]);

  // Auto-Refresh im Read-Only-Modus
  useEffect(() => {
    if (kioskMode === "readonly") {
      const interval = setInterval(loadData, 15000);
      return () => clearInterval(interval);
    }
  }, [kioskMode, loadData]);

  const getAttendance = (memberId: string) => {
    return attendances.find((a) => a.member_id === memberId);
  };

  const getStatusColor = (memberId: string) => {
    const att = getAttendance(memberId);
    if (!att) return "bg-gray-100 border-gray-300 text-bni-gray";
    switch (att.status) {
      case "PRESENT":
        return "bg-green-50 border-green-500 text-green-800";
      case "REPRESENTED":
        return "bg-yellow-50 border-yellow-500 text-yellow-800";
      case "ABSENT":
        return "bg-red-50 border-red-500 text-red-800";
    }
  };

  const getStatusLabel = (memberId: string) => {
    const att = getAttendance(memberId);
    if (!att) return "";
    switch (att.status) {
      case "PRESENT":
        return "Anwesend ✓";
      case "REPRESENTED":
        return `Vertreten: ${att.represented_by}`;
      case "ABSENT":
        return "Abwesend";
    }
  };

  const handleMemberClick = (member: Member) => {
    if (!canWrite) return;
    const existing = getAttendance(member.id);
    if (existing) return;
    setSelectedMember(member);
    setShowStatusModal(true);
  };

  const handleStatusSelect = async (status: AttendanceStatus, representedBy?: string) => {
    if (!meeting || !selectedMember) return;

    if (status === "PRESENT") {
      setShowStatusModal(false);
      setShowSignatureModal(true);
      return;
    }

    // Vertreten oder Abwesend: über API speichern
    await kioskFetch("/api/attendance/member", {
      method: "POST",
      body: JSON.stringify({
        meeting_id: meeting.id,
        member_id: selectedMember.id,
        status,
        represented_by: representedBy || null,
      }),
    });

    setShowStatusModal(false);
    setSelectedMember(null);
    loadData();
  };

  const handleSignatureComplete = async (signatureData: string) => {
    if (!meeting || !selectedMember) return;

    await kioskFetch("/api/attendance/member", {
      method: "POST",
      body: JSON.stringify({
        meeting_id: meeting.id,
        member_id: selectedMember.id,
        status: "PRESENT",
        signature_data: signatureData,
        disclaimer_accepted: true,
        disclaimer_accepted_at: new Date().toISOString(),
      }),
    });

    setShowSignatureModal(false);
    setSelectedMember(null);
    loadData();
  };

  const handleGuestSignatureComplete = async (signatureData: string) => {
    if (!meeting || !signingGuest) return;

    const needsBreakfast = signingGuest.total_visits >= 1;

    if (signingGuestAttendanceId) {
      // Vorausgefüllter Gast: bestehendes Record updaten
      await kioskFetch("/api/attendance/guest", {
        method: "PATCH",
        body: JSON.stringify({
          attendance_id: signingGuestAttendanceId,
          signature_data: signatureData,
          breakfast_paid: needsBreakfast,
          disclaimer_accepted: true,
          disclaimer_accepted_at: new Date().toISOString(),
        }),
      });
    } else {
      // Walk-in Gast: neues Record anlegen
      await kioskFetch("/api/attendance/guest", {
        method: "POST",
        body: JSON.stringify({
          meeting_id: meeting.id,
          guest_id: signingGuest.id,
          signature_data: signatureData,
          breakfast_paid: needsBreakfast,
          disclaimer_accepted: true,
          disclaimer_accepted_at: new Date().toISOString(),
        }),
      });
    }

    setShowSignatureModal(false);
    setSigningGuest(null);
    setSigningGuestAttendanceId(null);
    loadData();
  };

  const handlePendingGuestClick = (ga: GuestAttendance & { guest: Guest }) => {
    if (!canWrite) return;
    setSigningGuest(ga.guest);
    setSigningGuestAttendanceId(ga.id);
    setSelectedMember(null);
    setShowSignatureModal(true);
  };

  const handleGuestAdded = (guest: Guest) => {
    setShowGuestModal(false);
    setSigningGuest(guest);
    setSigningGuestAttendanceId(null);
    setSelectedMember(null);
    setShowSignatureModal(true);
  };

  const handleResetRequest = (memberId: string) => {
    if (!meeting || !canWrite) return;
    const existing = getAttendance(memberId);
    if (!existing) return;
    setResetMemberId(memberId);
    setResetPin("");
    setResetError("");
  };

  const handleResetConfirm = async () => {
    if (!meeting || !resetMemberId || !resetPin) return;
    try {
      const token = getKioskToken();
      const res = await fetch("/api/attendance/member", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-PIN": resetPin,
          ...(token ? { "X-Kiosk-Token": token } : {}),
        },
        body: JSON.stringify({
          meeting_id: meeting.id,
          member_id: resetMemberId,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setResetError(data.error || "Fehler beim Zurücksetzen");
        return;
      }
      setResetMemberId(null);
      setResetPin("");
      setResetError("");
      loadData();
    } catch {
      setResetError("Fehler beim Zurücksetzen");
    }
  };

  if (loading || kioskMode === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-bni-gray">Laden...</div>
      </div>
    );
  }

  const todayFormatted = new Date().toLocaleDateString("de-DE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-bni-gray-light">
      {/* Read-Only Banner */}
      {kioskMode === "readonly" && (
        <div className="bg-yellow-100 border-b-2 border-yellow-400 px-6 py-3 text-center">
          <p className="text-yellow-800 font-semibold">
            Nur-Lese-Modus — Anwesenheit kann nur am Kiosk-Gerät erfasst werden
          </p>
        </div>
      )}

      {/* Header */}
      <header className="bg-bni-red text-white py-3 px-4 sm:py-4 sm:px-6 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="shrink-0">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">BNI Königsforst</h1>
              <p className="text-xs sm:text-sm opacity-90">Anwesenheit</p>
            </div>
            {kioskMode === "kiosk" && (
              <span className="bg-white/20 text-white text-xs font-bold px-2 py-1 rounded-lg shrink-0">
                KIOSK
              </span>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm sm:text-lg font-semibold">{todayFormatted}</p>
            <p className="text-xs sm:text-sm opacity-90">
              {attendances.length} / {members.length} erfasst
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-3 sm:p-6">
        {/* Tutorial */}
        {canWrite && (
          <div className="mb-6 p-3 sm:p-4 rounded-xl bg-white border-2 border-gray-200 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-bni-gray">
            <span className="flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-bni-red text-white text-xs font-bold shrink-0">1</span>
              Tippe auf deinen Namen
            </span>
            <span className="text-gray-300 hidden sm:inline">&#8594;</span>
            <span className="flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-bni-red text-white text-xs font-bold shrink-0">2</span>
              Status auswählen
            </span>
            <span className="text-gray-300 hidden sm:inline">&#8594;</span>
            <span className="flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-bni-red text-white text-xs font-bold shrink-0">3</span>
              Unterschreiben &amp; bestätigen
            </span>
          </div>
        )}

        {/* Mitglieder-Grid */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-bni-gray mb-4">Mitglieder</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
            {members.map((member) => (
              <button
                key={member.id}
                onClick={() => handleMemberClick(member)}
                onDoubleClick={() => handleResetRequest(member.id)}
                disabled={!canWrite}
                className={`p-3 sm:p-4 rounded-xl border-2 text-left transition-all overflow-hidden ${
                  canWrite ? "active:scale-95" : "cursor-default"
                } ${getStatusColor(member.id)}`}
              >
                <p className="font-bold text-sm sm:text-lg truncate">{member.name}</p>
                {member.fachgebiet && (
                  <p className="text-xs sm:text-sm opacity-70 truncate">{member.fachgebiet}</p>
                )}
                {getAttendance(member.id) && (
                  <p className="text-xs sm:text-sm font-medium mt-1 truncate">
                    {getStatusLabel(member.id)}
                  </p>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Gäste-Bereich */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-bni-gray">
              Gäste ({guestAttendances.filter((ga) => ga.signature_data).length}/{guestAttendances.length})
            </h2>
            {canWrite && (
              <button
                onClick={() => setShowGuestModal(true)}
                className="bg-bni-red text-white px-4 py-2 sm:px-6 sm:py-3 rounded-xl font-semibold text-sm sm:text-lg active:scale-95 transition-all shrink-0"
              >
                + Gast hinzufügen
              </button>
            )}
          </div>
          {guestAttendances.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
              {/* Ausstehende Gäste (vorausgefüllt, noch nicht eingecheckt) */}
              {guestAttendances
                .filter((ga) => !ga.signature_data)
                .map((ga) => (
                  <button
                    key={ga.id}
                    onClick={() => handlePendingGuestClick(ga)}
                    disabled={!canWrite}
                    className={`p-3 sm:p-4 rounded-xl border-2 bg-gray-100 border-gray-300 text-bni-gray text-left overflow-hidden transition-all ${
                      canWrite ? "active:scale-95" : "cursor-default"
                    }`}
                  >
                    <p className="font-bold text-sm sm:text-lg truncate">{ga.guest?.name}</p>
                    {ga.guest?.firma && (
                      <p className="text-xs sm:text-sm opacity-70 truncate">{ga.guest.firma}</p>
                    )}
                    <p className="text-xs sm:text-sm font-medium mt-1 text-gray-500">
                      Noch nicht eingecheckt
                    </p>
                  </button>
                ))}
              {/* Eingecheckte Gäste */}
              {guestAttendances
                .filter((ga) => ga.signature_data)
                .map((ga) => (
                  <div
                    key={ga.id}
                    className="p-3 sm:p-4 rounded-xl border-2 bg-green-50 border-green-500 text-green-800 overflow-hidden"
                  >
                    <p className="font-bold text-sm sm:text-lg truncate">{ga.guest?.name}</p>
                    {ga.guest?.firma && (
                      <p className="text-xs sm:text-sm opacity-70 truncate">{ga.guest.firma}</p>
                    )}
                    <p className="text-xs sm:text-sm font-medium mt-1 truncate">
                      Besuch #{ga.guest?.total_visits}
                      {ga.breakfast_paid && " | Frühstück ✓"}
                    </p>
                  </div>
                ))}
            </div>
          )}
        </section>

        {/* Admin-Link */}
        <div className="mt-12 text-center">
          <a
            href="/admin"
            className="text-sm text-bni-gray opacity-50 hover:opacity-100 transition-opacity"
          >
            Admin-Bereich →
          </a>
        </div>
      </main>

      {/* Modals */}
      {showStatusModal && selectedMember && (
        <StatusModal
          member={selectedMember}
          onSelect={handleStatusSelect}
          onClose={() => {
            setShowStatusModal(false);
            setSelectedMember(null);
          }}
        />
      )}

      {showSignatureModal && (selectedMember || signingGuest) && (
        <SignatureModal
          name={selectedMember?.name || signingGuest?.name || ""}
          disclaimerText={disclaimerText}
          isGuest={!!signingGuest}
          needsBreakfast={
            signingGuest ? signingGuest.total_visits >= 1 : false
          }
          visitCount={signingGuest?.total_visits || 0}
          onComplete={
            signingGuest
              ? handleGuestSignatureComplete
              : handleSignatureComplete
          }
          onClose={() => {
            setShowSignatureModal(false);
            setSelectedMember(null);
            setSigningGuest(null);
            setSigningGuestAttendanceId(null);
          }}
        />
      )}

      {showGuestModal && meeting && (
        <GuestModal
          meetingId={meeting.id}
          onGuestAdded={handleGuestAdded}
          onClose={() => setShowGuestModal(false)}
        />
      )}

      {/* PIN-Dialog zum Zurücksetzen */}
      {resetMemberId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="text-xl font-bold text-bni-gray mb-2">
              Anwesenheit zurücksetzen
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Bitte Admin-PIN eingeben, um die Anwesenheit von{" "}
              <strong>
                {members.find((m) => m.id === resetMemberId)?.name}
              </strong>{" "}
              zurückzusetzen.
            </p>
            <input
              type="password"
              value={resetPin}
              onChange={(e) => {
                setResetPin(e.target.value);
                setResetError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleResetConfirm()}
              placeholder="Admin-PIN"
              className="w-full p-4 rounded-xl border-2 border-gray-300 text-lg text-center tracking-widest focus:border-bni-red focus:outline-none mb-3"
              autoFocus
            />
            {resetError && (
              <p className="text-red-500 text-sm text-center mb-3">{resetError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setResetMemberId(null);
                  setResetPin("");
                  setResetError("");
                }}
                className="flex-1 p-3 rounded-xl text-bni-gray font-medium hover:bg-gray-100 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleResetConfirm}
                disabled={!resetPin}
                className="flex-1 p-3 rounded-xl bg-red-600 text-white font-bold active:scale-95 transition-all disabled:opacity-50"
              >
                Zurücksetzen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

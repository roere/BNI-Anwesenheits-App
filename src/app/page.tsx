"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { kioskFetch, getKioskToken } from "@/lib/kiosk-api";
import { getBerlinMinutesNow, parseTimeToMinutes, formatBerlinTime } from "@/lib/time";
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
  // Getrennte Disclaimer-Texte für Mitglieder und Gäste (Vertreter zählen als Gast)
  const [disclaimerTextMembers, setDisclaimerTextMembers] = useState("");
  const [disclaimerTextGuests, setDisclaimerTextGuests] = useState("");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [signingGuest, setSigningGuest] = useState<Guest | null>(null);
  const [signingGuestAttendanceId, setSigningGuestAttendanceId] = useState<string | null>(null);
  // Gast, für den die Auswahl Einchecken/Abwesend angezeigt wird
  const [guestChoice, setGuestChoice] = useState<(GuestAttendance & { guest: Guest }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [kioskMode, setKioskMode] = useState<KioskMode>("loading");
  const [resetMemberId, setResetMemberId] = useState<string | null>(null);
  const [resetPin, setResetPin] = useState("");
  const [resetError, setResetError] = useState("");
  // Status, der nach der Unterschrift gespeichert wird (PRESENT, LATE oder REPRESENTED)
  const [pendingStatus, setPendingStatus] = useState<AttendanceStatus>("PRESENT");
  // Name des Vertreters, der nach der Unterschrift gespeichert wird
  const [pendingRepresentedBy, setPendingRepresentedBy] = useState<string | null>(null);
  // Automatische "zu spät"-Erkennung (Admin-Einstellung)
  const [lateThresholdEnabled, setLateThresholdEnabled] = useState(false);
  const [lateThresholdTime, setLateThresholdTime] = useState("");
  // Mitglied, das per Admin-PIN zurückgesetzt wurde: nächster Check-in ohne Auto-"zu spät"
  const [adminOverrideMemberId, setAdminOverrideMemberId] = useState<string | null>(null);
  // Aktionsmenü (Doppeltipp): "zu spät" umschalten / zurücksetzen
  const [actionMenuMember, setActionMenuMember] = useState<Member | null>(null);

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

    // Einstellungen laden (Disclaimer Mitglieder/Gäste + automatische "zu spät"-Erkennung)
    const { data: settingsData } = await supabase
      .from("settings")
      .select("key, value")
      .in("key", [
        "disclaimer_text",
        "disclaimer_text_guests",
        "late_threshold_enabled",
        "late_threshold_time",
      ]);

    if (settingsData) {
      const map = Object.fromEntries(settingsData.map((s) => [s.key, s.value]));
      if (map.disclaimer_text !== undefined) setDisclaimerTextMembers(map.disclaimer_text);
      // Fallback auf den Mitglieder-Disclaimer, falls der Gäste-Text noch nicht gepflegt ist
      setDisclaimerTextGuests(map.disclaimer_text_guests ?? map.disclaimer_text ?? "");
      setLateThresholdEnabled(map.late_threshold_enabled === "true");
      setLateThresholdTime(map.late_threshold_time ?? "");
    }

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
      // "Zu spät" wird wie "anwesend" dargestellt; nur die Uhrzeit ist rot
      case "LATE":
        return "bg-green-50 border-green-500 text-green-800";
      case "REPRESENTED":
        // Vorausgefüllter Vertreter ohne Unterschrift: Bestätigung ausstehend
        return att.signature_data
          ? "bg-yellow-50 border-yellow-500 text-yellow-800"
          : "bg-amber-50 border-amber-400 border-dashed text-amber-700";
      case "MEDICAL_ABSENT":
        return "bg-blue-50 border-blue-500 text-blue-800";
      case "ABSENT":
        return "bg-red-50 border-red-500 text-red-800";
    }
  };

  const getStatusLabel = (memberId: string) => {
    const att = getAttendance(memberId);
    if (!att) return null;
    // Check-in-Uhrzeit (Europe/Berlin) bei anwesenden / verspäteten Personen
    const time = formatBerlinTime(att.created_at);
    switch (att.status) {
      case "PRESENT":
        return <>Anwesend ✓{time && <> · {time}</>}</>;
      case "LATE":
        // wie "anwesend", aber die Uhrzeit signalisiert die Verspätung in Rot
        return (
          <>
            Anwesend ✓
            {time && (
              <>
                {" · "}
                <span className="text-red-600 font-semibold">{time}</span>
              </>
            )}
          </>
        );
      case "REPRESENTED":
        return att.signature_data
          ? `Vertreten: ${att.represented_by}`
          : `Vertretung ausstehend: ${att.represented_by} – zum Bestätigen tippen`;
      case "MEDICAL_ABSENT":
        return "Medizinisch abwesend";
      case "ABSENT":
        return "Abwesend";
    }
  };

  const handleMemberClick = (member: Member) => {
    if (!canWrite) return;
    const existing = getAttendance(member.id);
    if (existing) {
      // Vorausgefüllter Vertreter ohne Unterschrift → Bestätigung durch den Vertreter
      if (existing.status === "REPRESENTED" && !existing.signature_data) {
        setSelectedMember(member);
        setPendingStatus("REPRESENTED");
        setPendingRepresentedBy(existing.represented_by);
        setShowSignatureModal(true);
      }
      return;
    }
    setSelectedMember(member);
    setShowStatusModal(true);
  };

  // Doppeltipp öffnet das Aktionsmenü (nur bei bereits erfasstem Mitglied)
  const handleMemberDoubleClick = (member: Member) => {
    if (!canWrite) return;
    if (!getAttendance(member.id)) return;
    setActionMenuMember(member);
  };

  // "Anwesend" <-> "Zu spät" umschalten (ohne PIN, Unterschrift bleibt erhalten)
  const handleToggleLate = async (member: Member, toLate: boolean) => {
    const att = getAttendance(member.id);
    if (!meeting || !att) return;
    setActionMenuMember(null);
    await kioskFetch("/api/attendance/member", {
      method: "POST",
      body: JSON.stringify({
        meeting_id: meeting.id,
        member_id: member.id,
        status: toLate ? "LATE" : "PRESENT",
        represented_by: att.represented_by,
        signature_data: att.signature_data,
        disclaimer_accepted: att.disclaimer_accepted,
        disclaimer_accepted_at: att.disclaimer_accepted_at,
      }),
    });
    loadData();
  };

  // Prüft, ob ein "Anwesend"-Check-in nach der Schwellenzeit automatisch
  // als "zu spät" gewertet wird. Greift NICHT, wenn ein Admin das Mitglied
  // zuvor per PIN zurückgesetzt hat (manuelles Übersteuern bleibt möglich).
  const shouldAutoMarkLate = (memberId: string) => {
    if (adminOverrideMemberId === memberId) return false;
    if (!lateThresholdEnabled) return false;
    const threshold = parseTimeToMinutes(lateThresholdTime);
    if (threshold === null) return false;
    return getBerlinMinutesNow() >= threshold;
  };

  const handleStatusSelect = async (status: AttendanceStatus, representedBy?: string) => {
    if (!meeting || !selectedMember) return;

    // "Anwesend" und "Zu spät" benötigen eine Unterschrift (Mitglieder-Disclaimer).
    if (status === "PRESENT" || status === "LATE") {
      // "Anwesend" nach der Schwellenzeit automatisch in "zu spät" umwandeln
      const resolved =
        status === "PRESENT" && shouldAutoMarkLate(selectedMember.id) ? "LATE" : status;
      setPendingStatus(resolved);
      setPendingRepresentedBy(null);
      setShowStatusModal(false);
      setShowSignatureModal(true);
      return;
    }

    // Vertreter werden wie ein Gast behandelt: Unterschrift + Gäste-Disclaimer.
    // Es bleibt der EINE REPRESENTED-Datensatz des Mitglieds (keine Doppelzählung).
    if (status === "REPRESENTED") {
      setPendingStatus("REPRESENTED");
      setPendingRepresentedBy(representedBy || null);
      setShowStatusModal(false);
      setShowSignatureModal(true);
      return;
    }

    // Abwesend oder medizinisch abwesend: ohne Unterschrift speichern
    await kioskFetch("/api/attendance/member", {
      method: "POST",
      body: JSON.stringify({
        meeting_id: meeting.id,
        member_id: selectedMember.id,
        status,
        represented_by: null,
      }),
    });

    setShowStatusModal(false);
    setSelectedMember(null);
    setAdminOverrideMemberId(null);
    loadData();
  };

  const handleSignatureComplete = async (signatureData: string) => {
    if (!meeting || !selectedMember) return;

    await kioskFetch("/api/attendance/member", {
      method: "POST",
      body: JSON.stringify({
        meeting_id: meeting.id,
        member_id: selectedMember.id,
        status: pendingStatus,
        represented_by: pendingRepresentedBy,
        signature_data: signatureData,
        disclaimer_accepted: true,
        disclaimer_accepted_at: new Date().toISOString(),
      }),
    });

    setShowSignatureModal(false);
    setSelectedMember(null);
    setPendingStatus("PRESENT");
    setPendingRepresentedBy(null);
    setAdminOverrideMemberId(null);
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
    setGuestChoice(ga);
  };

  const handleGuestCheckin = (ga: GuestAttendance & { guest: Guest }) => {
    setGuestChoice(null);
    setSigningGuest(ga.guest);
    setSigningGuestAttendanceId(ga.id);
    setSelectedMember(null);
    setShowSignatureModal(true);
  };

  const handleGuestAbsent = async (
    ga: GuestAttendance & { guest: Guest },
    absent: boolean
  ) => {
    setGuestChoice(null);
    await kioskFetch("/api/attendance/guest", {
      method: "PATCH",
      body: JSON.stringify({ attendance_id: ga.id, absent }),
    });
    loadData();
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
      // Admin hat per PIN zurückgesetzt: nächster Check-in dieses Mitglieds
      // wird NICHT automatisch als "zu spät" gewertet (manuelles Übersteuern).
      setAdminOverrideMemberId(resetMemberId);
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
                onDoubleClick={() => handleMemberDoubleClick(member)}
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
              Gäste ({guestAttendances.filter((ga) => ga.signature_data).length}/
              {guestAttendances.filter((ga) => !ga.absent).length})
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
                .filter((ga) => !ga.signature_data && !ga.absent)
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
              {/* Abwesende Gäste */}
              {guestAttendances
                .filter((ga) => ga.absent && !ga.signature_data)
                .map((ga) => (
                  <button
                    key={ga.id}
                    onClick={() => handlePendingGuestClick(ga)}
                    disabled={!canWrite}
                    className={`p-3 sm:p-4 rounded-xl border-2 bg-red-50 border-red-400 text-red-800 text-left overflow-hidden transition-all ${
                      canWrite ? "active:scale-95" : "cursor-default"
                    }`}
                  >
                    <p className="font-bold text-sm sm:text-lg truncate">{ga.guest?.name}</p>
                    {ga.guest?.firma && (
                      <p className="text-xs sm:text-sm opacity-70 truncate">{ga.guest.firma}</p>
                    )}
                    <p className="text-xs sm:text-sm font-medium mt-1 truncate">Abwesend</p>
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
          name={
            signingGuest
              ? signingGuest.name
              : pendingStatus === "REPRESENTED"
              ? `${pendingRepresentedBy} (Vertretung für ${selectedMember?.name})`
              : selectedMember?.name || ""
          }
          // Vertreter unterschreiben mit dem Gäste-Disclaimer (wie ein Gast)
          disclaimerText={
            signingGuest || pendingStatus === "REPRESENTED"
              ? disclaimerTextGuests
              : disclaimerTextMembers
          }
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
            setPendingStatus("PRESENT");
            setPendingRepresentedBy(null);
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

      {/* Auswahl bei vorausgefülltem Gast: Einchecken oder Abwesend */}
      {guestChoice && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-4 sm:p-6 border-b">
              <h2 className="text-xl sm:text-2xl font-bold text-bni-gray truncate">
                {guestChoice.guest?.name}
              </h2>
              {guestChoice.guest?.firma && (
                <p className="text-bni-gray opacity-70 text-sm sm:text-base truncate">
                  {guestChoice.guest.firma}
                </p>
              )}
            </div>
            <div className="p-4 sm:p-6 space-y-3">
              <button
                onClick={() => handleGuestCheckin(guestChoice)}
                className="w-full p-3 sm:p-4 rounded-xl bg-green-500 text-white font-bold text-lg sm:text-xl active:scale-95 transition-all"
              >
                Einchecken
              </button>
              {guestChoice.absent ? (
                <button
                  onClick={() => handleGuestAbsent(guestChoice, false)}
                  className="w-full p-3 sm:p-4 rounded-xl bg-gray-200 text-bni-gray font-bold text-lg sm:text-xl active:scale-95 transition-all"
                >
                  Abwesend aufheben
                </button>
              ) : (
                <button
                  onClick={() => handleGuestAbsent(guestChoice, true)}
                  className="w-full p-3 sm:p-4 rounded-xl bg-red-500 text-white font-bold text-lg sm:text-xl active:scale-95 transition-all"
                >
                  Abwesend
                </button>
              )}
            </div>
            <div className="p-3 sm:p-4 border-t">
              <button
                onClick={() => setGuestChoice(null)}
                className="w-full p-3 rounded-xl text-bni-gray font-medium hover:bg-gray-100 transition-colors text-sm sm:text-base"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Aktionsmenü (Doppeltipp auf eine Mitglieder-Kachel) */}
      {actionMenuMember && (() => {
        const att = getAttendance(actionMenuMember.id);
        const isPresentOrLate = att?.status === "PRESENT" || att?.status === "LATE";
        return (
          <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 sm:p-4">
            <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md">
              <div className="p-4 sm:p-6 border-b">
                <h2 className="text-xl sm:text-2xl font-bold text-bni-gray truncate">
                  {actionMenuMember.name}
                </h2>
              </div>
              <div className="p-4 sm:p-6 space-y-3">
                {isPresentOrLate && att?.status === "PRESENT" && (
                  <button
                    onClick={() => handleToggleLate(actionMenuMember, true)}
                    className="w-full p-3 sm:p-4 rounded-xl bg-green-500 text-white font-bold text-lg sm:text-xl active:scale-95 transition-all"
                  >
                    Als zu spät markieren
                  </button>
                )}
                {isPresentOrLate && att?.status === "LATE" && (
                  <button
                    onClick={() => handleToggleLate(actionMenuMember, false)}
                    className="w-full p-3 sm:p-4 rounded-xl bg-green-500 text-white font-bold text-lg sm:text-xl active:scale-95 transition-all"
                  >
                    Als anwesend markieren
                  </button>
                )}
                <button
                  onClick={() => {
                    const m = actionMenuMember;
                    setActionMenuMember(null);
                    handleResetRequest(m.id);
                  }}
                  className="w-full p-3 sm:p-4 rounded-xl bg-red-500 text-white font-bold text-lg sm:text-xl active:scale-95 transition-all"
                >
                  Zurücksetzen (Admin-PIN)
                </button>
              </div>
              <div className="p-3 sm:p-4 border-t">
                <button
                  onClick={() => setActionMenuMember(null)}
                  className="w-full p-3 rounded-xl text-bni-gray font-medium hover:bg-gray-100 transition-colors text-sm sm:text-base"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        );
      })()}

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

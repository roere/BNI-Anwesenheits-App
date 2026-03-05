"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type {
  Member,
  MemberAttendance,
  Meeting,
  AttendanceStatus,
  Guest,
  GuestAttendance,
} from "@/lib/types";
import StatusModal from "@/components/StatusModal";
import SignatureModal from "@/components/SignatureModal";
import GuestModal from "@/components/GuestModal";

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
  const [loading, setLoading] = useState(true);

  const getTodayFriday = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  const loadData = useCallback(async () => {
    const todayDate = getTodayFriday();

    // Meeting für heute laden oder erstellen
    let { data: meetingData } = await supabase
      .from("meetings")
      .select("*")
      .eq("date", todayDate)
      .single();

    if (!meetingData) {
      const { data: newMeeting } = await supabase
        .from("meetings")
        .insert({ date: todayDate })
        .select()
        .single();
      meetingData = newMeeting;
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
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
    const existing = getAttendance(member.id);
    if (existing) return; // Bereits erfasst
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

    // Vertreten oder Abwesend: direkt speichern
    await supabase.from("member_attendance").insert({
      meeting_id: meeting.id,
      member_id: selectedMember.id,
      status,
      represented_by: representedBy || null,
    });

    setShowStatusModal(false);
    setSelectedMember(null);
    loadData();
  };

  const handleSignatureComplete = async (signatureData: string) => {
    if (!meeting || !selectedMember) return;

    await supabase.from("member_attendance").insert({
      meeting_id: meeting.id,
      member_id: selectedMember.id,
      status: "PRESENT",
      signature_data: signatureData,
      disclaimer_accepted: true,
      disclaimer_accepted_at: new Date().toISOString(),
    });

    setShowSignatureModal(false);
    setSelectedMember(null);
    loadData();
  };

  const handleGuestSignatureComplete = async (signatureData: string) => {
    if (!meeting || !signingGuest) return;

    const needsBreakfast = signingGuest.total_visits >= 1;

    await supabase.from("guest_attendance").insert({
      meeting_id: meeting.id,
      guest_id: signingGuest.id,
      signature_data: signatureData,
      breakfast_paid: needsBreakfast,
      disclaimer_accepted: true,
      disclaimer_accepted_at: new Date().toISOString(),
    });

    // Besuchszähler erhöhen
    await supabase
      .from("guests")
      .update({ total_visits: signingGuest.total_visits + 1 })
      .eq("id", signingGuest.id);

    setShowSignatureModal(false);
    setSigningGuest(null);
    loadData();
  };

  const handleGuestAdded = (guest: Guest) => {
    setShowGuestModal(false);
    setSigningGuest(guest);
    setSelectedMember(null);
    setShowSignatureModal(true);
  };

  const handleResetAttendance = async (memberId: string) => {
    if (!meeting) return;
    await supabase
      .from("member_attendance")
      .delete()
      .eq("meeting_id", meeting.id)
      .eq("member_id", memberId);
    loadData();
  };

  if (loading) {
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
      {/* Header */}
      <header className="bg-bni-red text-white py-4 px-6 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">BNI</h1>
            <p className="text-sm opacity-90">Anwesenheitserfassung</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold">{todayFormatted}</p>
            <p className="text-sm opacity-90">
              {attendances.length} / {members.length} erfasst
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        {/* Mitglieder-Grid */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-bni-gray mb-4">Mitglieder</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {members.map((member) => (
              <button
                key={member.id}
                onClick={() => handleMemberClick(member)}
                onDoubleClick={() => handleResetAttendance(member.id)}
                className={`p-4 rounded-xl border-2 text-left transition-all active:scale-95 ${getStatusColor(
                  member.id
                )}`}
              >
                <p className="font-bold text-lg">{member.name}</p>
                {member.fachgebiet && (
                  <p className="text-sm opacity-70">{member.fachgebiet}</p>
                )}
                {getAttendance(member.id) && (
                  <p className="text-sm font-medium mt-1">
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
              Gäste ({guestAttendances.length})
            </h2>
            <button
              onClick={() => setShowGuestModal(true)}
              className="bg-bni-red text-white px-6 py-3 rounded-xl font-semibold text-lg active:scale-95 transition-all"
            >
              + Gast hinzufügen
            </button>
          </div>
          {guestAttendances.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {guestAttendances.map((ga) => (
                <div
                  key={ga.id}
                  className="p-4 rounded-xl border-2 bg-green-50 border-green-500 text-green-800"
                >
                  <p className="font-bold text-lg">{ga.guest?.name}</p>
                  {ga.guest?.firma && (
                    <p className="text-sm opacity-70">{ga.guest.firma}</p>
                  )}
                  <p className="text-sm font-medium mt-1">
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
    </div>
  );
}

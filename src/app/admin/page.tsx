"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { adminFetch } from "@/lib/admin-api";
import type {
  Member,
  Guest,
  Meeting,
  MemberAttendance,
  GuestAttendance,
} from "@/lib/types";

type Tab = "members" | "guests" | "meetings" | "stats" | "settings" | "kiosk";

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [pin, setPin] = useState("");
  const [storedPin, setStoredPin] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("members");
  const [loginError, setLoginError] = useState("");

  const handleLogin = async () => {
    setLoginError("");
    try {
      await adminFetch("/api/admin/verify-pin", pin, {
        method: "POST",
        body: JSON.stringify({ pin }),
      });
      setStoredPin(pin);
      setAuthenticated(true);
    } catch {
      setLoginError("Falscher PIN");
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-bni-gray-light flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
          <h1 className="text-2xl font-bold text-bni-gray mb-6 text-center">
            Admin-Bereich
          </h1>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            placeholder="PIN eingeben"
            className="w-full p-4 rounded-xl border-2 border-gray-300 text-lg text-center tracking-widest focus:border-bni-red focus:outline-none mb-4"
          />
          {loginError && (
            <p className="text-red-500 text-sm text-center mb-4">{loginError}</p>
          )}
          <button
            onClick={handleLogin}
            className="w-full p-4 rounded-xl bg-bni-red text-white font-bold text-lg active:scale-95 transition-all"
          >
            Anmelden
          </button>
          <a
            href="/"
            className="block text-center mt-4 text-bni-gray opacity-50 hover:opacity-100"
          >
            ← Zurück zum Check-in
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bni-gray-light">
      <header className="bg-bni-red text-white py-4 px-6 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">BNI Königsforst Admin</h1>
          </div>
          <a href="/" className="text-white opacity-80 hover:opacity-100">
            ← Check-in
          </a>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-6xl mx-auto px-6 pt-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[
            { id: "members" as Tab, label: "Mitglieder" },
            { id: "guests" as Tab, label: "Gäste" },
            { id: "meetings" as Tab, label: "Meetings" },
            { id: "stats" as Tab, label: "Statistiken" },
            { id: "settings" as Tab, label: "Einstellungen" },
            { id: "kiosk" as Tab, label: "Kiosk-Modus" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? "bg-bni-red text-white"
                  : "bg-white text-bni-gray hover:bg-gray-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {activeTab === "members" && <MembersTab pin={storedPin} />}
        {activeTab === "guests" && <GuestsTab pin={storedPin} />}
        {activeTab === "meetings" && <MeetingsTab />}
        {activeTab === "stats" && <StatsTab />}
        {activeTab === "settings" && <SettingsTab pin={storedPin} />}
        {activeTab === "kiosk" && <KioskTab pin={storedPin} />}
      </div>
    </div>
  );
}

// ==================== Mitglieder-Tab ====================
function MembersTab({ pin }: { pin: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [newName, setNewName] = useState("");
  const [newFachgebiet, setNewFachgebiet] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const loadMembers = useCallback(async () => {
    const query = supabase.from("members").select("*").order("name");
    if (!showArchived) query.eq("active", true);
    const { data } = await query;
    if (data) setMembers(data);
  }, [showArchived]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await adminFetch("/api/admin/members", pin, {
      method: "POST",
      body: JSON.stringify({ name: newName.trim(), fachgebiet: newFachgebiet.trim() }),
    });
    setNewName("");
    setNewFachgebiet("");
    setShowAddForm(false);
    loadMembers();
  };

  const handleToggleActive = async (member: Member) => {
    await adminFetch(`/api/admin/members/${member.id}`, pin, {
      method: "PATCH",
      body: JSON.stringify({ active: !member.active }),
    });
    loadMembers();
  };

  const handleUpdate = async () => {
    if (!editingMember) return;
    await adminFetch(`/api/admin/members/${editingMember.id}`, pin, {
      method: "PATCH",
      body: JSON.stringify({
        name: editingMember.name,
        fachgebiet: editingMember.fachgebiet,
      }),
    });
    setEditingMember(null);
    loadMembers();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">
          Mitglieder ({members.length})
        </h2>
        <div className="flex gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
            />
            Archivierte zeigen
          </label>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-bni-red text-white px-4 py-2 rounded-xl font-medium"
          >
            + Hinzufügen
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="bg-white rounded-xl p-4 mb-4 flex gap-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Name"
            className="flex-1 p-3 rounded-lg border-2 border-gray-300 focus:border-bni-red focus:outline-none"
          />
          <input
            type="text"
            value={newFachgebiet}
            onChange={(e) => setNewFachgebiet(e.target.value)}
            placeholder="Fachgebiet"
            className="flex-1 p-3 rounded-lg border-2 border-gray-300 focus:border-bni-red focus:outline-none"
          />
          <button
            onClick={handleAdd}
            className="bg-green-500 text-white px-6 py-3 rounded-lg font-medium"
          >
            Speichern
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-4 font-semibold">Name</th>
              <th className="text-left p-4 font-semibold">Fachgebiet</th>
              <th className="text-left p-4 font-semibold">Status</th>
              <th className="text-right p-4 font-semibold">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id} className="border-t">
                <td className="p-4">
                  {editingMember?.id === member.id ? (
                    <input
                      value={editingMember.name}
                      onChange={(e) =>
                        setEditingMember({ ...editingMember, name: e.target.value })
                      }
                      className="p-2 rounded border-2 border-gray-300 focus:border-bni-red focus:outline-none w-full"
                    />
                  ) : (
                    <span className={!member.active ? "opacity-50" : ""}>
                      {member.name}
                    </span>
                  )}
                </td>
                <td className="p-4">
                  {editingMember?.id === member.id ? (
                    <input
                      value={editingMember.fachgebiet}
                      onChange={(e) =>
                        setEditingMember({
                          ...editingMember,
                          fachgebiet: e.target.value,
                        })
                      }
                      className="p-2 rounded border-2 border-gray-300 focus:border-bni-red focus:outline-none w-full"
                    />
                  ) : (
                    <span className={!member.active ? "opacity-50" : ""}>
                      {member.fachgebiet}
                    </span>
                  )}
                </td>
                <td className="p-4">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      member.active
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {member.active ? "Aktiv" : "Archiviert"}
                  </span>
                </td>
                <td className="p-4 text-right space-x-2">
                  {editingMember?.id === member.id ? (
                    <>
                      <button
                        onClick={handleUpdate}
                        className="text-green-600 font-medium"
                      >
                        Speichern
                      </button>
                      <button
                        onClick={() => setEditingMember(null)}
                        className="text-gray-500 font-medium"
                      >
                        Abbrechen
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setEditingMember({ ...member })}
                        className="text-blue-600 font-medium"
                      >
                        Bearbeiten
                      </button>
                      <button
                        onClick={() => handleToggleActive(member)}
                        className={
                          member.active
                            ? "text-red-600 font-medium"
                            : "text-green-600 font-medium"
                        }
                      >
                        {member.active ? "Archivieren" : "Aktivieren"}
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==================== Gäste-Tab ====================
function GuestsTab({ pin }: { pin: string }) {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [assignGuestName, setAssignGuestName] = useState("");
  const [assignGuestFirma, setAssignGuestFirma] = useState("");
  const [assignMeetingDate, setAssignMeetingDate] = useState("");

  const loadData = useCallback(async () => {
    const { data: guestsData } = await supabase
      .from("guests")
      .select("*")
      .order("name");
    if (guestsData) setGuests(guestsData);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAssignGuest = async () => {
    if (!assignGuestName.trim() || !assignMeetingDate) return;
    await adminFetch("/api/admin/guests/assign", pin, {
      method: "POST",
      body: JSON.stringify({
        guestName: assignGuestName.trim(),
        guestFirma: assignGuestFirma.trim(),
        meetingDate: assignMeetingDate,
      }),
    });
    setAssignGuestName("");
    setAssignGuestFirma("");
    setAssignMeetingDate("");
    setShowAssignForm(false);
    loadData();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Gäste ({guests.length})</h2>
        <button
          onClick={() => setShowAssignForm(!showAssignForm)}
          className="bg-bni-red text-white px-4 py-2 rounded-xl font-medium"
        >
          + Gast für Termin eintragen
        </button>
      </div>

      {showAssignForm && (
        <div className="bg-white rounded-xl p-4 mb-4 space-y-3">
          <div className="flex gap-3">
            <input
              type="text"
              value={assignGuestName}
              onChange={(e) => setAssignGuestName(e.target.value)}
              placeholder="Name des Gastes"
              className="flex-1 p-3 rounded-lg border-2 border-gray-300 focus:border-bni-red focus:outline-none"
            />
            <input
              type="text"
              value={assignGuestFirma}
              onChange={(e) => setAssignGuestFirma(e.target.value)}
              placeholder="Firma (optional)"
              className="flex-1 p-3 rounded-lg border-2 border-gray-300 focus:border-bni-red focus:outline-none"
            />
          </div>
          <div className="flex gap-3">
            <input
              type="date"
              value={assignMeetingDate}
              onChange={(e) => setAssignMeetingDate(e.target.value)}
              className="flex-1 p-3 rounded-lg border-2 border-gray-300 focus:border-bni-red focus:outline-none"
            />
            <button
              onClick={handleAssignGuest}
              className="bg-green-500 text-white px-6 py-3 rounded-lg font-medium"
            >
              Zuweisen
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-4 font-semibold">Name</th>
              <th className="text-left p-4 font-semibold">Firma</th>
              <th className="text-left p-4 font-semibold">Besuche</th>
              <th className="text-left p-4 font-semibold">Erstellt</th>
            </tr>
          </thead>
          <tbody>
            {guests.map((guest) => (
              <tr key={guest.id} className="border-t">
                <td className="p-4 font-medium">{guest.name}</td>
                <td className="p-4">{guest.firma || "-"}</td>
                <td className="p-4">{guest.total_visits}</td>
                <td className="p-4 text-sm text-gray-500">
                  {new Date(guest.created_at).toLocaleDateString("de-DE")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==================== Meetings-Tab ====================
function MeetingsTab() {
  const [meetings, setMeetings] = useState<(Meeting & { memberCount: number; guestCount: number })[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<string | null>(null);
  const [attendances, setAttendances] = useState<(MemberAttendance & { member: Member })[]>([]);
  const [guestAttendances, setGuestAttendances] = useState<(GuestAttendance & { guest: Guest })[]>([]);

  const exportPDF = async () => {
    const meeting = meetings.find((m) => m.id === selectedMeeting);
    if (!meeting) return;

    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();

    const dateStr = new Date(meeting.date + "T00:00:00").toLocaleDateString("de-DE", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const present = attendances.filter((a) => a.status === "PRESENT");
    const represented = attendances.filter((a) => a.status === "REPRESENTED");
    const absent = attendances.filter((a) => a.status === "ABSENT");

    // Header
    doc.setFontSize(20);
    doc.text("BNI Königsforst", 14, 20);
    doc.setFontSize(14);
    doc.text("Anwesenheitsliste", 14, 28);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(dateStr, 14, 36);

    // Zusammenfassung
    const checkedInGuests = guestAttendances.filter((ga) => ga.signature_data);
    const totalCheckedIn = present.length + represented.length + checkedInGuests.length;

    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(`Gesamtteilnehmer (eingecheckt): ${totalCheckedIn}`, 14, 44);
    doc.setTextColor(100);
    doc.text(
      `Anwesend: ${present.length}  |  Vertreten: ${represented.length}  |  Abwesend: ${absent.length}  |  Gäste: ${checkedInGuests.length}`,
      14,
      50
    );

    // Mitglieder-Tabelle
    let y = 62;
    doc.setTextColor(0);
    doc.setFontSize(12);
    doc.text("Mitglieder", 14, y);
    y += 4;

    // Tabellenkopf
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text("Name", 14, y + 6);
    doc.text("Status", 110, y + 6);
    doc.text("Vertretung", 150, y + 6);
    y += 8;
    doc.setDrawColor(200);
    doc.line(14, y, 196, y);
    y += 4;

    doc.setTextColor(0);
    doc.setFontSize(10);

    const sortedAttendances = [...attendances].sort((a, b) =>
      (a.member?.name || "").localeCompare(b.member?.name || "")
    );

    for (const a of sortedAttendances) {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      const statusText =
        a.status === "PRESENT"
          ? "Anwesend"
          : a.status === "REPRESENTED"
          ? "Vertreten"
          : "Abwesend";

      doc.text(a.member?.name || "", 14, y);
      doc.text(statusText, 110, y);
      if (a.represented_by) {
        doc.text(a.represented_by, 150, y);
      }
      y += 6;
    }

    // Gäste-Tabelle (inkl. Vertretungen)
    const vertretungen = represented.map((a) => ({
      name: a.represented_by || "",
      firma: a.member?.fachgebiet || "",
      status: "Vertretung für " + (a.member?.name || ""),
      isVertretung: true,
    }));
    const guestRows = guestAttendances.map((ga) => ({
      name: ga.guest?.name || "",
      firma: ga.guest?.firma || "",
      status: ga.signature_data ? "Eingecheckt" : "Nicht eingecheckt",
      isVertretung: false,
    }));
    const allGuests = [...guestRows, ...vertretungen];

    if (allGuests.length > 0) {
      y += 6;
      if (y > 260) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(12);
      doc.text("Gäste", 14, y);
      y += 4;

      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text("Name", 14, y + 6);
      doc.text("Firma", 80, y + 6);
      doc.text("Status", 150, y + 6);
      y += 8;
      doc.line(14, y, 196, y);
      y += 4;

      doc.setTextColor(0);
      doc.setFontSize(10);

      for (const g of allGuests) {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(g.name, 14, y);
        if (g.firma) {
          doc.text(g.firma, 80, y);
        }
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(g.status, 150, y);
        doc.setFontSize(10);
        doc.setTextColor(0);
        y += 6;
      }
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Erstellt am ${new Date().toLocaleDateString("de-DE")} um ${new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}`,
        14,
        287
      );
      doc.text(`Seite ${i} / ${pageCount}`, 180, 287);
    }

    doc.save(`BNI_Anwesenheit_${meeting.date}.pdf`);
  };

  const loadMeetings = useCallback(async () => {
    const { data: meetingsData } = await supabase
      .from("meetings")
      .select("*")
      .order("date", { ascending: false });

    if (meetingsData) {
      const enriched = await Promise.all(
        meetingsData.map(async (m) => {
          const { count: memberCount } = await supabase
            .from("member_attendance")
            .select("*", { count: "exact", head: true })
            .eq("meeting_id", m.id);
          const { count: guestCount } = await supabase
            .from("guest_attendance")
            .select("*", { count: "exact", head: true })
            .eq("meeting_id", m.id);
          return { ...m, memberCount: memberCount || 0, guestCount: guestCount || 0 };
        })
      );
      setMeetings(enriched);
    }
  }, []);

  useEffect(() => {
    loadMeetings();
  }, [loadMeetings]);

  const loadMeetingDetails = async (meetingId: string) => {
    setSelectedMeeting(meetingId);
    const { data: attData } = await supabase
      .from("member_attendance")
      .select("*, member:members(*)")
      .eq("meeting_id", meetingId);
    if (attData) setAttendances(attData as any);

    const { data: guestData } = await supabase
      .from("guest_attendance")
      .select("*, guest:guests(*)")
      .eq("meeting_id", meetingId);
    if (guestData) setGuestAttendances(guestData as any);
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Meeting-Historie</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Meeting-Liste */}
        <div className="bg-white rounded-xl overflow-hidden">
          {meetings.map((m) => (
            <button
              key={m.id}
              onClick={() => loadMeetingDetails(m.id)}
              className={`w-full p-4 text-left border-b last:border-b-0 transition-colors ${
                selectedMeeting === m.id ? "bg-bni-red text-white" : "hover:bg-gray-50"
              }`}
            >
              <p className="font-bold">
                {new Date(m.date + "T00:00:00").toLocaleDateString("de-DE", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
              <p className={`text-sm ${selectedMeeting === m.id ? "opacity-80" : "text-gray-500"}`}>
                {m.memberCount} Mitglieder · {m.guestCount} Gäste
              </p>
            </button>
          ))}
        </div>

        {/* Meeting-Details */}
        {selectedMeeting && (
          <div className="bg-white rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-lg">Anwesenheit</h3>
              <button
                onClick={exportPDF}
                className="bg-bni-red text-white px-4 py-2 rounded-xl font-medium text-sm active:scale-95 transition-all"
              >
                PDF exportieren
              </button>
            </div>
            <div className="space-y-2">
              {attendances.map((a) => (
                <div
                  key={a.id}
                  className={`p-3 rounded-lg flex items-center justify-between ${
                    a.status === "PRESENT"
                      ? "bg-green-50"
                      : a.status === "REPRESENTED"
                      ? "bg-yellow-50"
                      : "bg-red-50"
                  }`}
                >
                  <span className="font-medium">{a.member?.name}</span>
                  <span className="text-sm">
                    {a.status === "PRESENT" && "Anwesend"}
                    {a.status === "REPRESENTED" && `Vertreten: ${a.represented_by}`}
                    {a.status === "ABSENT" && "Abwesend"}
                  </span>
                </div>
              ))}
              {guestAttendances.length > 0 && (
                <>
                  <h4 className="font-bold mt-4">Gäste</h4>
                  {guestAttendances.map((ga) => (
                    <div key={ga.id} className="p-3 rounded-lg bg-blue-50">
                      <span className="font-medium">{ga.guest?.name}</span>
                      {ga.guest?.firma && (
                        <span className="text-sm text-gray-500 ml-2">
                          ({ga.guest.firma})
                        </span>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== Statistiken-Tab ====================
function StatsTab() {
  const [stats, setStats] = useState<
    { member: Member; present: number; represented: number; absent: number; total: number }[]
  >([]);
  const [period, setPeriod] = useState("all");

  const loadStats = useCallback(async () => {
    const { data: members } = await supabase
      .from("members")
      .select("*")
      .order("name");

    if (!members) return;

    let query = supabase.from("member_attendance").select("*");

    if (period !== "all") {
      const now = new Date();
      let fromDate: Date;
      if (period === "month") {
        fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (period === "quarter") {
        const quarter = Math.floor(now.getMonth() / 3);
        fromDate = new Date(now.getFullYear(), quarter * 3, 1);
      } else {
        fromDate = new Date(now.getFullYear(), 0, 1);
      }
      const { data: meetingsInRange } = await supabase
        .from("meetings")
        .select("id")
        .gte("date", fromDate.toISOString().split("T")[0]);

      if (meetingsInRange) {
        const meetingIds = meetingsInRange.map((m) => m.id);
        if (meetingIds.length > 0) {
          query = query.in("meeting_id", meetingIds);
        }
      }
    }

    const { data: attendances } = await query;

    const memberStats = members.map((member) => {
      const memberAtt = (attendances || []).filter(
        (a) => a.member_id === member.id
      );
      return {
        member,
        present: memberAtt.filter((a) => a.status === "PRESENT").length,
        represented: memberAtt.filter((a) => a.status === "REPRESENTED").length,
        absent: memberAtt.filter((a) => a.status === "ABSENT").length,
        total: memberAtt.length,
      };
    });

    setStats(memberStats);
  }, [period]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Anwesenheitsstatistik</h2>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="p-2 rounded-lg border-2 border-gray-300 focus:border-bni-red focus:outline-none"
        >
          <option value="all">Gesamt</option>
          <option value="month">Aktueller Monat</option>
          <option value="quarter">Aktuelles Quartal</option>
          <option value="year">Aktuelles Jahr</option>
        </select>
      </div>

      <div className="bg-white rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-4 font-semibold">Mitglied</th>
              <th className="text-center p-4 font-semibold">Anwesend</th>
              <th className="text-center p-4 font-semibold">Vertreten</th>
              <th className="text-center p-4 font-semibold">Abwesend</th>
              <th className="text-center p-4 font-semibold">Quote</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s) => {
              const quote =
                s.total > 0
                  ? Math.round(((s.present + s.represented) / s.total) * 100)
                  : 0;
              return (
                <tr key={s.member.id} className="border-t">
                  <td className="p-4">
                    <span className={!s.member.active ? "opacity-50" : ""}>
                      {s.member.name}
                    </span>
                  </td>
                  <td className="p-4 text-center text-green-600 font-medium">
                    {s.present}
                  </td>
                  <td className="p-4 text-center text-yellow-600 font-medium">
                    {s.represented}
                  </td>
                  <td className="p-4 text-center text-red-600 font-medium">
                    {s.absent}
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: `${quote}%` }}
                        />
                      </div>
                      <span className="font-medium text-sm">{quote}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==================== Einstellungen-Tab ====================
function SettingsTab({ pin }: { pin: string }) {
  const [disclaimerText, setDisclaimerText] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "disclaimer_text")
        .single();
      if (data) setDisclaimerText(data.value);
    };
    load();
  }, []);

  const handleSave = async () => {
    await adminFetch("/api/admin/settings", pin, {
      method: "PUT",
      body: JSON.stringify({ key: "disclaimer_text", value: disclaimerText }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Einstellungen</h2>

      <div className="bg-white rounded-xl p-6">
        <h3 className="font-bold text-lg mb-3">Disclaimer-Text</h3>
        <p className="text-sm text-gray-500 mb-3">
          Dieser Text wird vor der Unterschrift angezeigt und muss von allen
          Teilnehmern bestätigt werden.
        </p>
        <textarea
          value={disclaimerText}
          onChange={(e) => setDisclaimerText(e.target.value)}
          rows={8}
          className="w-full p-4 rounded-xl border-2 border-gray-300 focus:border-bni-red focus:outline-none resize-y"
        />
        <button
          onClick={handleSave}
          className={`mt-4 px-6 py-3 rounded-xl text-white font-bold transition-all ${
            saved ? "bg-green-500" : "bg-bni-red"
          }`}
        >
          {saved ? "Gespeichert ✓" : "Speichern"}
        </button>
      </div>
    </div>
  );
}

// ==================== Kiosk-Modus-Tab ====================
function KioskTab({ pin }: { pin: string }) {
  const [kioskActive, setKioskActive] = useState(false);
  const [tokenPreview, setTokenPreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [justActivated, setJustActivated] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const data = await adminFetch<{ active: boolean; tokenPreview?: string }>(
        "/api/kiosk/status",
        pin
      );
      setKioskActive(data.active);
      setTokenPreview(data.tokenPreview || "");
    } catch {
      // Kiosk-Modus noch nicht konfiguriert
    }
    setLoading(false);
  }, [pin]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleActivate = async () => {
    try {
      const data = await adminFetch<{ token: string; message: string }>(
        "/api/kiosk/activate",
        pin,
        { method: "POST" }
      );
      localStorage.setItem("bni_kiosk_token", data.token);
      setKioskActive(true);
      setJustActivated(true);
      loadStatus();
    } catch {
      // Fehler beim Aktivieren
    }
  };

  const handleDeactivate = async () => {
    try {
      await adminFetch("/api/kiosk/deactivate", pin, { method: "POST" });
      localStorage.removeItem("bni_kiosk_token");
      setKioskActive(false);
      setJustActivated(false);
      loadStatus();
    } catch {
      // Fehler beim Deaktivieren
    }
  };

  const handleRegenerate = async () => {
    await handleActivate();
  };

  if (loading) {
    return <div className="text-bni-gray">Laden...</div>;
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Kiosk-Modus</h2>

      <div className="bg-white rounded-xl p-6 space-y-6">
        {/* Status-Anzeige */}
        <div className="flex items-center gap-4">
          <div
            className={`w-4 h-4 rounded-full ${
              kioskActive ? "bg-green-500" : "bg-gray-400"
            }`}
          />
          <span className="text-lg font-bold">
            Kiosk-Modus: {kioskActive ? "AKTIV" : "INAKTIV"}
          </span>
        </div>

        {justActivated && (
          <div className="p-4 rounded-xl bg-green-50 border-2 border-green-400">
            <p className="font-semibold text-green-800">
              Kiosk-Modus wurde aktiviert. Dieses Gerät ist nun als Kiosk autorisiert.
            </p>
          </div>
        )}

        {!kioskActive ? (
          <>
            <div className="p-4 rounded-xl bg-blue-50 border-2 border-blue-300">
              <p className="text-blue-800">
                Im Kiosk-Modus kann nur dieses Gerät Anwesenheit erfassen.
                Alle anderen Geräte sehen eine Nur-Lese-Ansicht.
              </p>
              <p className="text-blue-800 mt-2 text-sm">
                Wenn der Kiosk-Modus deaktiviert ist, können alle Geräte Anwesenheit erfassen.
              </p>
            </div>
            <button
              onClick={handleActivate}
              className="w-full p-4 rounded-xl bg-bni-red text-white font-bold text-lg active:scale-95 transition-all"
            >
              Kiosk-Modus aktivieren
            </button>
          </>
        ) : (
          <>
            {tokenPreview && (
              <div className="p-4 rounded-xl bg-gray-50 border-2 border-gray-300">
                <p className="text-sm text-bni-gray">
                  Autorisiertes Gerät-Token: <code className="font-mono">{tokenPreview}</code>
                </p>
              </div>
            )}
            <div className="p-4 rounded-xl bg-yellow-50 border-2 border-yellow-400">
              <p className="text-yellow-800 text-sm">
                Dieses Gerät ist als Kiosk autorisiert. Wenn Sie den Kiosk-Modus deaktivieren,
                können alle Geräte Anwesenheit erfassen.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleDeactivate}
                className="flex-1 p-4 rounded-xl bg-red-600 text-white font-bold active:scale-95 transition-all"
              >
                Kiosk-Modus deaktivieren
              </button>
              <button
                onClick={handleRegenerate}
                className="flex-1 p-4 rounded-xl bg-gray-600 text-white font-bold active:scale-95 transition-all"
              >
                Neuen Token generieren
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

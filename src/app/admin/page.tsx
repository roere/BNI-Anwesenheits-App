"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { adminFetch } from "@/lib/admin-api";
import { formatBerlinTime, getWeekday, WEEKDAY_NAMES } from "@/lib/time";
import { matchMemberId } from "@/lib/match-member";
import type {
  Member,
  Guest,
  Meeting,
  MemberAttendance,
  GuestAttendance,
  ParsedBesucherliste,
} from "@/lib/types";

// Zeile in der Import-Vorschau (aus der PDF geparst, vom Admin editierbar)
type ImportRow = {
  name: string;
  firma: string;
  type: "guest" | "representative";
  representedFor: string | null;
  memberId: string; // bei Vertretern: zugeordnetes Mitglied
  include: boolean;
};

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
        {activeTab === "meetings" && <MeetingsTab pin={storedPin} />}
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
  const [members, setMembers] = useState<Member[]>([]);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [assignGuestName, setAssignGuestName] = useState("");
  const [assignGuestFirma, setAssignGuestFirma] = useState("");
  const [assignMeetingDate, setAssignMeetingDate] = useState("");

  // PDF-Import (Besucher- und Vertreterliste)
  const [importRows, setImportRows] = useState<ImportRow[] | null>(null);
  const [importDate, setImportDate] = useState("");
  const [importBusy, setImportBusy] = useState(false);
  const [importMsg, setImportMsg] = useState("");

  const loadData = useCallback(async () => {
    const [{ data: guestsData }, { data: membersData }] = await Promise.all([
      supabase.from("guests").select("*").order("name"),
      supabase.from("members").select("*").eq("active", true).order("name"),
    ]);
    if (guestsData) setGuests(guestsData);
    if (membersData) setMembers(membersData);
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

  // PDF hochladen → parsen → Vorschau aufbauen (noch kein Schreibvorgang)
  const handleParseFile = async (file: File) => {
    setImportBusy(true);
    setImportMsg("");
    setImportRows(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/guests/parse", {
        method: "POST",
        headers: { "X-Admin-PIN": pin },
        body: form,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Fehler ${res.status}`);
      }
      const parsed: ParsedBesucherliste = await res.json();
      const rows: ImportRow[] = parsed.entries.map((e) => ({
        name: e.name,
        firma: e.firma,
        type: e.type,
        representedFor: e.representedFor,
        memberId:
          e.type === "representative" ? matchMemberId(e.representedFor, members) : "",
        include: true,
      }));
      setImportRows(rows);
      setImportDate(parsed.eventDate || "");
      if (rows.length === 0) setImportMsg("Keine Einträge in der PDF erkannt.");
    } catch (err) {
      setImportMsg(err instanceof Error ? err.message : "Import fehlgeschlagen");
    } finally {
      setImportBusy(false);
    }
  };

  const updateRow = (idx: number, patch: Partial<ImportRow>) => {
    setImportRows((rows) =>
      rows ? rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)) : rows
    );
  };

  const handleConfirmImport = async () => {
    if (!importRows || !importDate) return;
    setImportBusy(true);
    setImportMsg("");
    const selected = importRows.filter((r) => r.include && r.name.trim());
    let ok = 0;
    const errors: string[] = [];

    for (const row of selected) {
      try {
        if (row.type === "representative") {
          if (!row.memberId) {
            errors.push(`${row.name}: kein Mitglied zugeordnet`);
            continue;
          }
          await adminFetch("/api/admin/representatives/assign", pin, {
            method: "POST",
            body: JSON.stringify({
              memberId: row.memberId,
              representativeName: row.name.trim(),
              meetingDate: importDate,
            }),
          });
        } else {
          await adminFetch("/api/admin/guests/assign", pin, {
            method: "POST",
            body: JSON.stringify({
              guestName: row.name.trim(),
              guestFirma: row.firma.trim(),
              meetingDate: importDate,
            }),
          });
        }
        ok++;
      } catch (err) {
        errors.push(`${row.name}: ${err instanceof Error ? err.message : "Fehler"}`);
      }
    }

    setImportBusy(false);
    setImportRows(null);
    setImportMsg(
      `${ok} Eintrag/Einträge importiert${
        errors.length ? ` · ${errors.length} Fehler: ${errors.join("; ")}` : ""
      }`
    );
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

      {/* PDF-Import: Besucher- und Vertreterliste */}
      <div className="bg-white rounded-xl p-4 mb-4">
        <h3 className="font-bold text-lg mb-1">Aus PDF importieren</h3>
        <p className="text-sm text-gray-500 mb-3">
          BNI-Besucher- und Vertreterliste hochladen. Gäste und Vertreter werden
          erkannt, in der Vorschau geprüft und dann für den Termin vorausgefüllt.
        </p>
        <input
          type="file"
          accept="application/pdf,.pdf"
          disabled={importBusy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleParseFile(f);
            e.target.value = "";
          }}
          className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-bni-red file:text-white file:font-medium"
        />
        {importBusy && <p className="text-sm text-gray-500 mt-3">Wird verarbeitet…</p>}
        {importMsg && (
          <p className="text-sm mt-3 text-bni-gray bg-gray-50 rounded-lg p-3">{importMsg}</p>
        )}

        {importRows && importRows.length > 0 && (
          <div className="mt-4">
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <label className="font-medium text-sm">Termin:</label>
              <input
                type="date"
                value={importDate}
                onChange={(e) => setImportDate(e.target.value)}
                className="p-2 rounded-lg border-2 border-gray-300 focus:border-bni-red focus:outline-none"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 text-center">Import</th>
                    <th className="p-2 text-left">Name</th>
                    <th className="p-2 text-left">Firma</th>
                    <th className="p-2 text-left">Typ</th>
                    <th className="p-2 text-left">Vertreten für (Mitglied)</th>
                  </tr>
                </thead>
                <tbody>
                  {importRows.map((row, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="p-2 text-center">
                        <input
                          type="checkbox"
                          checked={row.include}
                          onChange={(e) => updateRow(idx, { include: e.target.checked })}
                          className="w-5 h-5 accent-bni-red"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.name}
                          onChange={(e) => updateRow(idx, { name: e.target.value })}
                          className="w-full p-1.5 rounded border border-gray-300 focus:border-bni-red focus:outline-none"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.firma}
                          onChange={(e) => updateRow(idx, { firma: e.target.value })}
                          className="w-full p-1.5 rounded border border-gray-300 focus:border-bni-red focus:outline-none"
                        />
                      </td>
                      <td className="p-2">
                        <select
                          value={row.type}
                          onChange={(e) =>
                            updateRow(idx, {
                              type: e.target.value as "guest" | "representative",
                            })
                          }
                          className="p-1.5 rounded border border-gray-300 focus:border-bni-red focus:outline-none"
                        >
                          <option value="guest">Gast</option>
                          <option value="representative">Vertreter</option>
                        </select>
                      </td>
                      <td className="p-2">
                        {row.type === "representative" ? (
                          <select
                            value={row.memberId}
                            onChange={(e) => updateRow(idx, { memberId: e.target.value })}
                            className={`w-full p-1.5 rounded border focus:outline-none ${
                              row.memberId
                                ? "border-gray-300 focus:border-bni-red"
                                : "border-red-400"
                            }`}
                          >
                            <option value="">– Mitglied wählen –</option>
                            {members.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-gray-400">–</span>
                        )}
                        {row.representedFor && (
                          <span className="block text-xs text-gray-400 mt-0.5">
                            PDF: „{row.representedFor}"
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={handleConfirmImport}
                disabled={importBusy || !importDate}
                className="bg-green-500 text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50"
              >
                {importBusy ? "Importiere…" : "Importieren"}
              </button>
              <button
                onClick={() => setImportRows(null)}
                className="px-6 py-3 rounded-lg font-medium text-bni-gray hover:bg-gray-100"
              >
                Abbrechen
              </button>
            </div>
          </div>
        )}
      </div>

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
function MeetingsTab({ pin }: { pin: string }) {
  const [meetings, setMeetings] = useState<(Meeting & { memberCount: number; guestCount: number })[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<string | null>(null);
  const [attendances, setAttendances] = useState<(MemberAttendance & { member: Member })[]>([]);
  const [guestAttendances, setGuestAttendances] = useState<(GuestAttendance & { guest: Guest })[]>([]);
  // Treffen-Wochentag-Filter: standardmäßig nur Treffen am konfigurierten Wochentag
  const [meetingWeekday, setMeetingWeekday] = useState(5);
  const [showAllDays, setShowAllDays] = useState(false);

  const toggleGuestAbsent = async (attendanceId: string, absent: boolean) => {
    await adminFetch("/api/admin/guests/absent", pin, {
      method: "POST",
      body: JSON.stringify({ attendance_id: attendanceId, absent }),
    });
    if (selectedMeeting) loadMeetingDetails(selectedMeeting);
  };

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
    const late = attendances.filter((a) => a.status === "LATE");
    const represented = attendances.filter((a) => a.status === "REPRESENTED");
    const medicalAbsent = attendances.filter((a) => a.status === "MEDICAL_ABSENT");
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
    const totalCheckedIn =
      present.length + late.length + represented.length + checkedInGuests.length;

    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(`Gesamtteilnehmer (eingecheckt): ${totalCheckedIn}`, 14, 44);
    doc.setTextColor(100);
    doc.text(
      `Anwesend: ${present.length}  |  Zu spät: ${late.length}  |  Vertreten: ${represented.length}  |  Medizinisch: ${medicalAbsent.length}  |  Abwesend: ${absent.length}  |  Gäste: ${checkedInGuests.length}`,
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
    doc.text("Status", 95, y + 6);
    doc.text("Uhrzeit", 140, y + 6);
    doc.text("Vertretung", 165, y + 6);
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
          : a.status === "LATE"
          ? "Zu spät"
          : a.status === "REPRESENTED"
          ? "Vertreten"
          : a.status === "MEDICAL_ABSENT"
          ? "Medizinisch abw."
          : "Abwesend";

      // Uhrzeit nur bei physischer Anwesenheit (anwesend / zu spät)
      const timeText =
        a.status === "PRESENT" || a.status === "LATE"
          ? formatBerlinTime(a.created_at)
          : "";

      doc.text(a.member?.name || "", 14, y);
      doc.text(statusText, 95, y);
      if (timeText) {
        doc.text(timeText, 140, y);
      }
      if (a.represented_by) {
        doc.text(a.represented_by, 165, y);
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

  useEffect(() => {
    const loadWeekday = async () => {
      const { data } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "meeting_weekday")
        .single();
      const w = parseInt(data?.value ?? "5", 10);
      if (!Number.isNaN(w) && w >= 0 && w <= 6) setMeetingWeekday(w);
    };
    loadWeekday();
  }, []);

  const visibleMeetings = showAllDays
    ? meetings
    : meetings.filter((m) => getWeekday(m.date) === meetingWeekday);

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
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-xl font-bold">Meeting-Historie</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showAllDays}
            onChange={(e) => setShowAllDays(e.target.checked)}
          />
          Auch andere Wochentage zeigen
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Meeting-Liste */}
        <div className="bg-white rounded-xl overflow-hidden">
          {visibleMeetings.length === 0 && (
            <p className="p-4 text-sm text-gray-500">
              Keine Treffen am {WEEKDAY_NAMES[meetingWeekday]}. Aktiviere „Auch andere
              Wochentage zeigen", um abweichende Termine zu sehen.
            </p>
          )}
          {visibleMeetings.map((m) => (
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
                      : a.status === "LATE"
                      ? "bg-orange-50"
                      : a.status === "REPRESENTED"
                      ? "bg-yellow-50"
                      : a.status === "MEDICAL_ABSENT"
                      ? "bg-blue-50"
                      : "bg-red-50"
                  }`}
                >
                  <span className="font-medium">{a.member?.name}</span>
                  <span className="text-sm">
                    {a.status === "PRESENT" &&
                      `Anwesend${formatBerlinTime(a.created_at) ? ` · ${formatBerlinTime(a.created_at)}` : ""}`}
                    {a.status === "LATE" &&
                      `Zu spät${formatBerlinTime(a.created_at) ? ` · ${formatBerlinTime(a.created_at)}` : ""}`}
                    {a.status === "REPRESENTED" && `Vertreten: ${a.represented_by}`}
                    {a.status === "MEDICAL_ABSENT" && "Medizinisch abwesend"}
                    {a.status === "ABSENT" && "Abwesend"}
                  </span>
                </div>
              ))}
              {guestAttendances.length > 0 && (
                <>
                  <h4 className="font-bold mt-4">Gäste</h4>
                  {guestAttendances.map((ga) => (
                    <div
                      key={ga.id}
                      className={`p-3 rounded-lg flex items-center justify-between gap-3 ${
                        ga.absent
                          ? "bg-red-50"
                          : ga.signature_data
                          ? "bg-green-50"
                          : "bg-blue-50"
                      }`}
                    >
                      <div className="min-w-0">
                        <span className="font-medium">{ga.guest?.name}</span>
                        {ga.guest?.firma && (
                          <span className="text-sm text-gray-500 ml-2">
                            ({ga.guest.firma})
                          </span>
                        )}
                        <span className="block text-xs mt-0.5 text-gray-500">
                          {ga.absent
                            ? "Abwesend"
                            : ga.signature_data
                            ? "Eingecheckt"
                            : "Noch nicht eingecheckt"}
                        </span>
                      </div>
                      {!ga.signature_data && (
                        <button
                          onClick={() => toggleGuestAbsent(ga.id, !ga.absent)}
                          className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium ${
                            ga.absent
                              ? "bg-gray-200 text-bni-gray"
                              : "bg-red-500 text-white"
                          }`}
                        >
                          {ga.absent ? "Abwesend aufheben" : "Abwesend"}
                        </button>
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
    {
      member: Member;
      present: number;
      late: number;
      represented: number;
      medical: number;
      absent: number;
      total: number;
    }[]
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
        late: memberAtt.filter((a) => a.status === "LATE").length,
        represented: memberAtt.filter((a) => a.status === "REPRESENTED").length,
        medical: memberAtt.filter((a) => a.status === "MEDICAL_ABSENT").length,
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
              <th className="text-center p-4 font-semibold">Zu spät</th>
              <th className="text-center p-4 font-semibold">Vertreten</th>
              <th className="text-center p-4 font-semibold">Medizin.</th>
              <th className="text-center p-4 font-semibold">Abwesend</th>
              <th className="text-center p-4 font-semibold">Quote</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s) => {
              // Medizinisch abwesend ist entschuldigt und fließt nicht in die Quote ein.
              const relevant = s.total - s.medical;
              const quote =
                relevant > 0
                  ? Math.round(
                      ((s.present + s.late + s.represented) / relevant) * 100
                    )
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
                  <td className="p-4 text-center text-orange-600 font-medium">
                    {s.late}
                  </td>
                  <td className="p-4 text-center text-yellow-600 font-medium">
                    {s.represented}
                  </td>
                  <td className="p-4 text-center text-blue-600 font-medium">
                    {s.medical}
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
  // Getrennter Disclaimer für Gäste (gilt auch für Vertreter)
  const [disclaimerTextGuests, setDisclaimerTextGuests] = useState("");
  const [savedGuests, setSavedGuests] = useState(false);
  // Automatische "zu spät"-Erkennung
  const [lateEnabled, setLateEnabled] = useState(false);
  const [lateTime, setLateTime] = useState("07:00");
  const [lateSaved, setLateSaved] = useState(false);
  // Treffen-Wochentag (0=Sonntag .. 6=Samstag)
  const [meetingWeekday, setMeetingWeekday] = useState("5");
  const [weekdaySaved, setWeekdaySaved] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("settings")
        .select("key, value")
        .in("key", [
          "disclaimer_text",
          "disclaimer_text_guests",
          "late_threshold_enabled",
          "late_threshold_time",
          "meeting_weekday",
        ]);
      if (data) {
        const map = Object.fromEntries(data.map((s) => [s.key, s.value]));
        if (map.disclaimer_text !== undefined) setDisclaimerText(map.disclaimer_text);
        // Fallback auf den Mitglieder-Text, falls der Gäste-Text noch nicht gepflegt ist
        setDisclaimerTextGuests(map.disclaimer_text_guests ?? map.disclaimer_text ?? "");
        setLateEnabled(map.late_threshold_enabled === "true");
        if (map.late_threshold_time) setLateTime(map.late_threshold_time);
        if (map.meeting_weekday !== undefined) setMeetingWeekday(map.meeting_weekday);
      }
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

  const handleSaveGuests = async () => {
    await adminFetch("/api/admin/settings", pin, {
      method: "PUT",
      body: JSON.stringify({ key: "disclaimer_text_guests", value: disclaimerTextGuests }),
    });
    setSavedGuests(true);
    setTimeout(() => setSavedGuests(false), 2000);
  };

  const handleSaveWeekday = async () => {
    await adminFetch("/api/admin/settings", pin, {
      method: "PUT",
      body: JSON.stringify({ key: "meeting_weekday", value: meetingWeekday }),
    });
    setWeekdaySaved(true);
    setTimeout(() => setWeekdaySaved(false), 2000);
  };

  const handleSaveLate = async () => {
    await adminFetch("/api/admin/settings", pin, {
      method: "PUT",
      body: JSON.stringify({
        key: "late_threshold_enabled",
        value: lateEnabled ? "true" : "false",
      }),
    });
    await adminFetch("/api/admin/settings", pin, {
      method: "PUT",
      body: JSON.stringify({ key: "late_threshold_time", value: lateTime }),
    });
    setLateSaved(true);
    setTimeout(() => setLateSaved(false), 2000);
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Einstellungen</h2>

      <div className="bg-white rounded-xl p-6">
        <h3 className="font-bold text-lg mb-3">Treffen-Wochentag</h3>
        <p className="text-sm text-gray-500 mb-4">
          An welchem Wochentag die wöchentlichen Treffen stattfinden. Nur an diesem
          Tag kann Anwesenheit erfasst werden. In der Meeting-Übersicht werden
          standardmäßig nur Treffen dieses Wochentags angezeigt.
        </p>
        <div className="flex items-center gap-3">
          <label className="font-medium text-sm">Wochentag:</label>
          <select
            value={meetingWeekday}
            onChange={(e) => setMeetingWeekday(e.target.value)}
            className="p-2 rounded-lg border-2 border-gray-300 focus:border-bni-red focus:outline-none"
          >
            {[1, 2, 3, 4, 5, 6, 0].map((d) => (
              <option key={d} value={String(d)}>
                {WEEKDAY_NAMES[d]}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={handleSaveWeekday}
          className={`mt-4 px-6 py-3 rounded-xl text-white font-bold transition-all ${
            weekdaySaved ? "bg-green-500" : "bg-bni-red"
          }`}
        >
          {weekdaySaved ? "Gespeichert ✓" : "Speichern"}
        </button>
      </div>

      <div className="bg-white rounded-xl p-6 mt-6">
        <h3 className="font-bold text-lg mb-3">Disclaimer-Text – Mitglieder</h3>
        <p className="text-sm text-gray-500 mb-3">
          Dieser Text wird Mitgliedern vor der Unterschrift angezeigt und muss
          beim Check-in bestätigt werden.
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

      <div className="bg-white rounded-xl p-6 mt-6">
        <h3 className="font-bold text-lg mb-3">Disclaimer-Text – Gäste &amp; Vertreter</h3>
        <p className="text-sm text-gray-500 mb-3">
          Dieser Text wird Gästen sowie Vertretern (bei „Vertreten durch…")
          vor der Unterschrift angezeigt und muss bestätigt werden.
        </p>
        <textarea
          value={disclaimerTextGuests}
          onChange={(e) => setDisclaimerTextGuests(e.target.value)}
          rows={8}
          className="w-full p-4 rounded-xl border-2 border-gray-300 focus:border-bni-red focus:outline-none resize-y"
        />
        <button
          onClick={handleSaveGuests}
          className={`mt-4 px-6 py-3 rounded-xl text-white font-bold transition-all ${
            savedGuests ? "bg-green-500" : "bg-bni-red"
          }`}
        >
          {savedGuests ? "Gespeichert ✓" : "Speichern"}
        </button>
      </div>

      <div className="bg-white rounded-xl p-6 mt-6">
        <h3 className="font-bold text-lg mb-3">Automatische „zu spät"-Erkennung</h3>
        <p className="text-sm text-gray-500 mb-4">
          Ist diese Funktion aktiv, wird ein Mitglied, das sich nach der
          eingestellten Uhrzeit auf „Anwesend" setzt, automatisch als „zu spät"
          erfasst. Die Uhrzeit gilt für die deutsche Zeitzone (MEZ/MESZ).
          Manuelles Übersteuern per Doppeltipp + Admin-PIN bleibt unberührt –
          dabei lässt sich auch nach der Schwellenzeit „Anwesend" setzen.
        </p>

        <label className="flex items-center gap-3 mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={lateEnabled}
            onChange={(e) => setLateEnabled(e.target.checked)}
            className="w-5 h-5 accent-bni-red"
          />
          <span className="font-medium">Funktion aktivieren</span>
        </label>

        <div className="flex items-center gap-3">
          <label className="font-medium text-sm">Schwellenzeit:</label>
          <input
            type="time"
            value={lateTime}
            onChange={(e) => setLateTime(e.target.value)}
            disabled={!lateEnabled}
            className="p-2 rounded-lg border-2 border-gray-300 focus:border-bni-red focus:outline-none disabled:opacity-50"
          />
        </div>

        <button
          onClick={handleSaveLate}
          className={`mt-4 px-6 py-3 rounded-xl text-white font-bold transition-all ${
            lateSaved ? "bg-green-500" : "bg-bni-red"
          }`}
        >
          {lateSaved ? "Gespeichert ✓" : "Speichern"}
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

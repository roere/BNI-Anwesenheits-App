export type AttendanceStatus =
  | "PRESENT"
  | "REPRESENTED"
  | "ABSENT"
  | "LATE"
  | "MEDICAL_ABSENT";

export interface Member {
  id: string;
  name: string;
  fachgebiet: string;
  active: boolean;
  created_at: string;
}

export interface Guest {
  id: string;
  name: string;
  firma: string | null;
  total_visits: number;
  created_at: string;
}

export interface Meeting {
  id: string;
  date: string;
  created_at: string;
}

export interface MemberAttendance {
  id: string;
  meeting_id: string;
  member_id: string;
  status: AttendanceStatus;
  represented_by: string | null;
  signature_data: string | null;
  disclaimer_accepted: boolean;
  disclaimer_accepted_at: string | null;
  created_at: string;
}

export interface GuestAttendance {
  id: string;
  meeting_id: string;
  guest_id: string;
  signature_data: string | null;
  breakfast_paid: boolean;
  absent: boolean;
  // Im Admin nachträglich als anwesend eingetragen (ohne Unterschrift am Kiosk)
  admin_checked_in: boolean;
  disclaimer_accepted: boolean;
  disclaimer_accepted_at: string | null;
  created_at: string;
}

// Aus der BNI-Besucher- und Vertreterliste (PDF) geparster Eintrag
export interface ParsedBesucherEntry {
  name: string;
  firma: string;
  code: string; // B/V-Code aus der Liste (z.B. "BNI", "B", "BNI+V")
  type: "guest" | "representative";
  representedFor: string | null; // bei Vertretern: Name des vertretenen Mitglieds
}

export interface ParsedBesucherliste {
  eventDate: string | null; // ISO yyyy-mm-dd
  entries: ParsedBesucherEntry[];
}

export interface Setting {
  id: string;
  key: string;
  value: string;
}

export interface MemberWithAttendance extends Member {
  attendance?: MemberAttendance;
}

export interface GuestWithAttendance extends Guest {
  attendance?: GuestAttendance;
}

// Kiosk-Modus Types
export interface KioskStatus {
  active: boolean;
  tokenPreview?: string;
}

export interface KioskActivateResponse {
  token: string;
  message: string;
}

export interface KioskValidateResponse {
  valid: boolean;
  mode: "kiosk" | "readonly" | "open";
}

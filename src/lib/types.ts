export type AttendanceStatus = "PRESENT" | "REPRESENTED" | "ABSENT";

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
  disclaimer_accepted: boolean;
  disclaimer_accepted_at: string | null;
  created_at: string;
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

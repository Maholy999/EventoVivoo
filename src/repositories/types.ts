export type SessionStatus = 'draft' | 'published' | 'cancelled';
export type EnrollmentStatus = 'confirmed' | 'waitlisted' | 'cancelled';
export type UserRole = 'participant' | 'organizer';

export interface DbSession {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  capacity: number;
  starts_at: Date;
  ends_at: Date;
  status: SessionStatus;
  organizer_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface DbEnrollment {
  id: string;
  session_id: string;
  user_id: string;
  status: EnrollmentStatus;
  position: number | null;
  enrolled_at: Date;
  updated_at: Date;
}

export interface DbAttendance {
  id: string;
  enrollment_id: string;
  qr_token: string;
  recorded_at: Date;
}

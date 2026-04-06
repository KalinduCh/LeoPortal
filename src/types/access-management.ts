export type RegistrationStatus = 'registered' | 'checked_in';

export interface AccessEvent {
  id: string;
  name: string;
  date: string;
  time: string;
  location: string;
  description: string;
  capacity?: number;
  createdAt: string;
}

export interface AccessRegistration {
  id: string;
  eventId: string;
  name: string;
  email: string;
  club: string;
  role: string;
  status: RegistrationStatus;
  checkInTime?: string;
  ticketId: string;
  createdAt: string;
  qrCodeData?: string; // Base64 representation if stored
}

export interface RegistrationStats {
  total: number;
  checkedIn: number;
  remaining: number;
  percentage: number;
}

export interface ClubBreakdown {
  club: string;
  registered: number;
  checkedIn: number;
}
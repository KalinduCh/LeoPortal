
export type AccessRegistrationStatus = 'registered' | 'checked_in';

export interface AccessEvent {
  id: string;
  name: string;
  date: string;
  time: string;
  location: string;
  description: string;
  capacity?: number;
  organizerId: string; // The ID of the admin who created this platform instance
  createdAt: string;
}

export interface AccessRegistration {
  id: string;
  eventId: string;
  name: string;
  email: string;
  club: string;
  role: string;
  status: AccessRegistrationStatus;
  checkInTime?: string;
  ticketId: string;
  createdAt: string;
}

export interface AccessPlatformStats {
  total: number;
  checkedIn: number;
  remaining: number;
  percentage: number;
}

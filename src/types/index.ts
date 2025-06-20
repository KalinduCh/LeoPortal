
export type UserRole = 'admin' | 'member';

export interface User {
  id: string;
  name: string;
  email: string;
  photoUrl?: string;
  role: UserRole;
}

export interface Event {
  id: string;
  name: string;
  date: string; // ISO string
  description: string;
  location: string;
}

export interface AttendanceRecord {
  id: string;
  eventId: string;
  userId: string;
  timestamp: string; // ISO string
  status: 'present' | 'absent'; // Or other relevant statuses
}

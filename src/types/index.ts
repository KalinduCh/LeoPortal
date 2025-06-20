
export type UserRole = 'admin' | 'member';

export interface User {
  id: string; // This will be the Firebase Auth UID
  name: string;
  email: string;
  photoUrl?: string;
  role: UserRole;
  // createdAt?: any; // Can be added if you store it from Firestore (Timestamp or string)
}

export interface Event {
  id: string; // Firestore document ID
  name: string;
  date: string; // ISO string (converted from Firestore Timestamp)
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

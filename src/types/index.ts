
export type UserRole = 'admin' | 'member';

export interface User {
  id: string; // This will be the Firebase Auth UID
  name: string;
  email: string;
  photoUrl?: string;
  role: UserRole;
  nic?: string;
  dateOfBirth?: string; // Stored as "YYYY-MM-DD" string
  gender?: string;
  mobileNumber?: string;
  // createdAt?: any;
}

export interface Event {
  id: string; // Firestore document ID
  name: string;
  date: string; // ISO string (converted from Firestore Timestamp)
  description: string;
  location: string; // Textual location
  latitude?: number;  // For geolocation
  longitude?: number; // For geolocation
}

export interface AttendanceRecord {
  id: string; // Firestore document ID
  eventId: string;
  userId: string;
  timestamp: string; // ISO string of when attendance was marked
  status: 'present'; // Initially just 'present'
  // Optional: store location where attendance was marked for audit
  markedLatitude?: number;
  markedLongitude?: number;
}


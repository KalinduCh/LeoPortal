
import type { ReactElement, ElementType } from 'react';

export type UserRole = 'admin' | 'member';

export type BadgeId = 'club_leader' | 'top_volunteer' | 'active_leo';

export interface Badge {
  id: BadgeId;
  name: string;
  description: string;
  icon: ElementType;
}

export interface User {
  id: string; // This will be the Firebase Auth UID
  name: string;
  email: string;
  photoUrl?: string;
  role: UserRole;
  designation?: string;
  nic?: string;
  dateOfBirth?: string; // Stored as "YYYY-MM-DD" string
  gender?: string;
  mobileNumber?: string;
  badges?: BadgeId[];
}

export interface Event {
  id: string; // Firestore document ID
  name: string;
  startDate: string; // Primary date field: ISO string (converted from Firestore Timestamp)
  endDate?: string; // Optional: ISO string for multi-day or timed events
  description: string;
  location: string; // Textual location
  latitude?: number;  // For geolocation
  longitude?: number; // For geolocation
}

export interface AttendanceRecord {
  id: string; // Firestore document ID
  eventId: string;
  timestamp: string; // ISO string of when attendance was marked
  status: 'present'; 

  attendanceType: 'member' | 'visitor';

  // For members
  userId?: string; // Firebase Auth UID of the member

  // For visitors
  visitorName?: string;
  visitorDesignation?: string;
  visitorClub?: string;
  visitorComment?: string;

  // Optional: store location where attendance was marked for audit
  markedLatitude?: number;
  markedLongitude?: number;
}

// This summary type is used for displaying participants on the admin event summary page.
export interface EventParticipantSummary {
  id: string; // For members: userId. For visitors: attendanceRecordId.
  attendanceTimestamp: string; // ISO string
  type: 'member' | 'visitor';

  // Member specific details (populated if type is 'member' by fetching User profile)
  userName?: string; 
  userEmail?: string;
  userRole?: UserRole;
  userDesignation?: string;
  userPhotoUrl?: string;
  userNic?: string; // Example: If NIC needs to be displayed for members

  // Visitor specific details (taken directly from AttendanceRecord if type is 'visitor')
  visitorName?: string;
  visitorDesignation?: string;
  visitorClub?: string;
  visitorComment?: string; // Displaying comments could be useful
}

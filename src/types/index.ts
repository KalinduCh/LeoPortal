
import type { ReactElement, ElementType } from 'react';

export type UserRole = 'super_admin' | 'admin' | 'member';

export type BadgeId = 'club_leader' | 'top_volunteer' | 'active_leo';

export interface Badge {
  id: BadgeId;
  name: string;
  description: string;
  icon: ElementType;
}

export type AdminPermission = 'members' | 'events' | 'finance' | 'communication' | 'project_ideas' | 'reports';

export interface User {
  id: string; // This will be the Firebase Auth UID
  name: string;
  email: string;
  photoUrl?: string;
  role: UserRole;
  status: 'pending' | 'approved' | 'rejected';
  createdAt?: string; // ISO string of when user was created
  designation?: string;
  nic?: string;
  dateOfBirth?: string; // Stored as "YYYY-MM-DD" string
  gender?: string;
  mobileNumber?: string;
  badges?: BadgeId[];
  fcmToken?: string; // For Push Notifications
  membershipFeeStatus?: 'paid' | 'pending' | 'partial';
  membershipFeeAmountPaid?: number;
  permissions?: Partial<Record<AdminPermission, boolean>>;
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
  reminderSent?: boolean; // To track if a reminder has been sent
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

// This represents the full, detailed project proposal after AI generation and before saving to Firestore.
export interface ProjectIdea {
    id: string; // Firestore Document ID
    projectName: string;
    goal: string;
    targetAudience: string;
    budget: string;
    timeline: string;
    specialConsiderations?: string;

    // Generated Fields from the new template
    projectIdea: string;
    proposedActionPlan: {
        objective: string;
        preEventPlan: string[];
        executionPlan: string[];
        postEventPlan: string[];
    };
    implementationChallenges: string[];
    challengeSolutions: string[];
    communityInvolvement: string[];
    prPlan: {
        activity: string;
        date: string;
        time: string;
    }[];
    estimatedExpenses: {
        item: string;
        cost: string;
    }[];
    resourcePersonals: string[];

    // Metadata
    status: 'draft' | 'pending_review' | 'needs_revision' | 'approved' | 'declined';
    authorId: string;
    authorName: string;
    createdAt: string; // ISO string
    updatedAt: string; // ISO string
    adminFeedback?: string; // New field for admin comments
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
  userNic?: string; 

  // Visitor specific details (taken directly from AttendanceRecord if type is 'visitor')
  visitorName?: string;
  visitorDesignation?: string;
  visitorClub?: string;
  visitorComment?: string;
}

export interface ContactInfo {
    name: string;
    email: string;
    phone: string;
}

export interface ContactSettings {
    president: ContactInfo;
    support: ContactInfo;
}

export interface CommunicationGroup {
  id: string;
  name: string;
  memberIds: string[];
  createdAt: string; // ISO string
  color?: string; // Optional: hex color code for the group button
}

export interface Transaction {
    id: string;
    type: 'income' | 'expense';
    date: string; // ISO string
    amount: number;
    category: string;
    source: string; // e.g., 'Membership Dues', 'Venue Rental'
    notes?: string;
    createdAt: string; // ISO string
}

export interface FinancialCategory {
    id: string;
    name: string;
}

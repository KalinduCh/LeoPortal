
export type AccessRegistrationStatus = 'registered' | 'checked_in';

export interface AccessEvent {
  id: string;
  name: string;
  date: string;
  time: string;
  location: string;
  description: string;
  imageUrl?: string; // Banner image for the registration page
  customEmailBody?: string; // Custom message for the ticketing email
  attachmentUrl?: string; // Optional attachment for the ticketing email (base64 or link)
  attachmentName?: string;
  capacity?: number;
  organizerId: string; // The ID of the admin who created this platform instance
  createdAt: string;
  // Registration controls
  isRegistrationClosed?: boolean;
  registrationClosingDate?: string;
}

export interface RegistrationSubmitter {
  name: string;
  designation: string;
  club: string;
  email: string;
  contact: string;
}

export interface AccessRegistration {
  id: string;
  eventId: string;
  name: string;
  email: string;
  club: string;
  contactNumber: string;
  role: string; // Used for Member Type (Lions/Leo/Others)
  foodPreference: 'veg' | 'non_veg';
  status: AccessRegistrationStatus;
  emailStatus: 'success' | 'failed' | 'pending';
  checkInTime?: string;
  ticketId: string;
  createdAt: string;
  registeredBy?: RegistrationSubmitter; // Metadata for who performed the registration
}

export interface AccessPlatformStats {
  total: number;
  checkedIn: number;
  remaining: number;
  percentage: number;
}

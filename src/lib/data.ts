
import type { User, Event, AttendanceRecord } from '@/types';

// mockUsers is no longer the primary source of truth for users if Firebase is integrated.
// It can be kept for reference or removed. For now, I'll comment it out to avoid confusion.
/*
export const mockUsers: User[] = [
  {
    id: 'user1',
    name: 'Admin User',
    email: 'admin@leoportal.com',
    photoUrl: 'https://placehold.co/100x100.png',
    role: 'admin',
  },
  {
    id: 'user2',
    name: 'Member One',
    email: 'member1@leoportal.com',
    photoUrl: 'https://placehold.co/100x100.png',
    role: 'member',
  },
  {
    id: 'user3',
    name: 'Member Two',
    email: 'member2@leoportal.com',
    photoUrl: 'https://placehold.co/100x100.png',
    role: 'member',
  },
   {
    id: 'user4',
    name: 'Admin Two',
    email: 'check2@gmail.com',
    photoUrl: 'https://placehold.co/100x100.png',
    role: 'admin',
  },
];
*/

// mockEvents is no longer the primary source of truth for events if Firebase is integrated.
// It can be kept for reference or removed. For now, I'll comment it out.
/*
export const mockEvents: Event[] = [
  {
    id: 'event1',
    name: 'Annual Charity Drive',
    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // One week from now
    description: 'Join us for our annual charity drive to support local communities. Volunteers needed for sorting and distribution.',
    location: 'Community Hall, Downtown',
  },
  {
    id: 'event2',
    name: 'Leo Club Monthly Meeting',
    date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // Two weeks from now
    description: 'Regular monthly meeting to discuss upcoming projects, financials, and member activities. All members are encouraged to attend.',
    location: 'Online via Zoom',
  },
  {
    id: 'event3',
    name: 'Beach Cleanup Day',
    date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(), // Three weeks from now
    description: 'Help us keep our beaches clean! We will provide gloves, bags, and refreshments. A great way to contribute to environmental conservation.',
    location: 'Sunset Beach, West End',
  },
];
*/

// mockAttendanceRecords is no longer needed as primary source; data will be fetched from Firestore.
// This can be removed or kept empty.
export const mockAttendanceRecords: AttendanceRecord[] = [];

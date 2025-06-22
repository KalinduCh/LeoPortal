
'use client'; // This file will be used by client components and contains components.

import type { User, AttendanceRecord, Badge, BadgeId } from '@/types';
import { ShieldCheck, Medal, Star } from 'lucide-react';

export const BADGE_DEFINITIONS: Record<BadgeId, Omit<Badge, 'id'>> = {
  club_leader: {
    name: 'Club Leader',
    description: 'Holds a key leadership position in the club.',
    icon: ShieldCheck,
  },
  top_volunteer: {
    name: 'Top Volunteer',
    description: 'Highest event attendance in the selected period.',
    icon: Medal,
  },
  active_leo: {
    name: 'Active Leo',
    description: 'Attended 3 or more events.',
    icon: Star,
  },
};

/**
 * Calculates which badges a user has earned based on their profile and activity.
 * @param user The user object.
 * @param attendanceRecords An array of the user's attendance records.
 * @param isTopVolunteer Optional: A boolean indicating if the user is the top volunteer for a period.
 * @returns An array of BadgeId strings.
 */
export function calculateBadgeIds(
  user: User,
  attendanceRecords: AttendanceRecord[],
  isTopVolunteer: boolean = false
): BadgeId[] {
  const earnedBadges: Set<BadgeId> = new Set();

  // Rule 1: Club Leader
  const designation = user.designation?.toLowerCase() || '';
  const isLeader =
    user.role === 'admin' ||
    designation.includes('president') ||
    designation.includes('secretary') ||
    designation.includes('treasurer') ||
    designation.includes('director');
  if (isLeader) {
    earnedBadges.add('club_leader');
  }

  // Rule 2: Top Volunteer
  if (isTopVolunteer) {
    earnedBadges.add('top_volunteer');
  }

  // Rule 3: Active Leo
  if (attendanceRecords.length >= 3) {
    earnedBadges.add('active_leo');
  }

  return Array.from(earnedBadges);
}


import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin/config';
import { generateIcsString } from '@/lib/ics-utils';
import type { Event } from '@/types';

/**
 * @fileOverview Dynamic ICS Feed Endpoint
 * Provides a live iCalendar feed for external subscriptions (WordPress, Google Cal, etc.)
 */

export async function GET(req: NextRequest) {
  try {
    // 1. Fetch all events from Firestore using Admin SDK
    const eventsSnap = await adminDb().collection('events')
      .orderBy('startDate', 'asc')
      .get();

    const events = eventsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Event));

    // 2. Generate the ICS string
    const icsString = generateIcsString(events);

    // 3. Return the response with correct calendar headers
    return new NextResponse(icsString, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="leo-club-calendar.ics"',
        // Disable aggressive caching so the feed updates regularly
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
      },
    });
  } catch (error: any) {
    console.error('ICS_FEED_ERROR:', error);
    return NextResponse.json({ error: 'Failed to generate calendar feed' }, { status: 500 });
  }
}

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
    // 1. Attempt to fetch all events from Firestore using Admin SDK
    const eventsSnap = await adminDb().collection('events').get();

    if (eventsSnap.empty) {
        // Return an empty calendar rather than an error if no events exist
        return new NextResponse(generateIcsString([]), {
            status: 200,
            headers: { 'Content-Type': 'text/calendar; charset=utf-8' },
        });
    }

    const events = eventsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Event));

    // 2. Generate the ICS string using the robust utility
    const icsString = generateIcsString(events);

    // 3. Return the response with correct calendar headers
    return new NextResponse(icsString, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="leo-club-calendar.ics"',
        // Cache for 1 hour to reduce server load while keeping feed fresh
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
      },
    });
  } catch (error: any) {
    // Log the actual error to the server console for debugging
    console.error('ICS_FEED_GENERATION_FAILURE:', error);
    
    return NextResponse.json({ 
        error: 'Failed to generate calendar feed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

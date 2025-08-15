
// src/services/eventService.ts
import { collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, Timestamp, query, orderBy, deleteField } from 'firebase/firestore';
import { db } from '@/lib/firebase/clientApp';
import type { Event } from '@/types';
import type { EventFormValues } from '@/components/events/event-form';

const eventsCollection = collection(db, 'events');

// EventFormValues now includes optional endDate and conditional lat/long
export async function createEvent(data: EventFormValues): Promise<string> {
  console.log("Creating event with form data:", data);
  const eventData: any = {
    name: data.name,
    startDate: Timestamp.fromDate(data.startDate),
    location: data.location,
    description: data.description,
  };

  if (data.endDate) {
    eventData.endDate = Timestamp.fromDate(data.endDate);
  }

  if (data.enableGeoRestriction && typeof data.latitude === 'number' && !isNaN(data.latitude)) {
    eventData.latitude = data.latitude;
  }
  if (data.enableGeoRestriction && typeof data.longitude === 'number' && !isNaN(data.longitude)) {
    eventData.longitude = data.longitude;
  }

  const docRef = await addDoc(eventsCollection, eventData);
  console.log("Event created with ID:", docRef.id);
  return docRef.id;
}

export async function getEvents(): Promise<Event[]> {
  console.log("[EventService] Attempting to fetch events from Firestore...");
  try {
    const q = query(eventsCollection, orderBy('startDate', 'asc'));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.warn("[EventService] Firestore 'events' collection is empty or the query returned no documents.");
      return [];
    }

    console.log(`[EventService] Successfully fetched ${snapshot.docs.length} raw event documents.`);

    const events = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      if (!data.startDate || typeof data.startDate.toDate !== 'function') {
        console.warn(`[EventService] Event ${docSnap.id} has invalid or missing startDate. Skipping. Data:`, data);
        return null;
      }
      const event: Event = {
        id: docSnap.id,
        name: data.name,
        startDate: (data.startDate as Timestamp).toDate().toISOString(),
        location: data.location,
        description: data.description,
        latitude: data.latitude,
        longitude: data.longitude,
      };
      if (data.endDate && typeof data.endDate.toDate === 'function') {
        event.endDate = (data.endDate as Timestamp).toDate().toISOString();
      }
      return event;
    }).filter(event => event !== null) as Event[];
    
    console.log(`[EventService] Returning ${events.length} parsed and valid events.`);
    return events;
  } catch (error) {
      console.error("CRITICAL ERROR in getEvents service:", error);
      // Return empty array to prevent app crash, the error is logged for debugging.
      return [];
  }
}

export async function getEvent(eventId: string): Promise<Event | null> {
  const eventRef = doc(db, 'events', eventId);
  const docSnap = await getDoc(eventRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    if (!data.startDate || typeof data.startDate.toDate !== 'function') {
      console.error(`Event ${docSnap.id} has invalid or missing startDate. Data:`, data);
      return null;
    }
    const event: Event = {
      id: docSnap.id,
      name: data.name,
      startDate: (data.startDate as Timestamp).toDate().toISOString(),
      location: data.location,
      description: data.description,
      latitude: data.latitude,
      longitude: data.longitude,
    };
    if (data.endDate && typeof data.endDate.toDate === 'function') {
      event.endDate = (data.endDate as Timestamp).toDate().toISOString();
    }
    return event;
  }
  return null;
}

export async function updateEvent(eventId: string, data: EventFormValues): Promise<void> {
  const eventRef = doc(db, 'events', eventId);
  const updatePayload: any = {
    name: data.name,
    startDate: Timestamp.fromDate(data.startDate),
    location: data.location,
    description: data.description,
  };

  if (data.endDate) {
    updatePayload.endDate = Timestamp.fromDate(data.endDate);
  } else {
    updatePayload.endDate = deleteField(); // Remove field if it's not provided
  }

  if (data.enableGeoRestriction && typeof data.latitude === 'number' && !isNaN(data.latitude) && typeof data.longitude === 'number' && !isNaN(data.longitude) ) {
    updatePayload.latitude = data.latitude;
    updatePayload.longitude = data.longitude;
  } else {
    updatePayload.latitude = deleteField();
    updatePayload.longitude = deleteField();
  }
  
  await updateDoc(eventRef, updatePayload);
  console.log(`Event ${eventId} updated.`);
}

export async function deleteEvent(eventId: string): Promise<void> {
  const eventRef = doc(db, 'events', eventId);
  await deleteDoc(eventRef);
}

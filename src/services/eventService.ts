
// src/services/eventService.ts
import { collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, Timestamp, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/clientApp';
import type { Event } from '@/types';
import type { EventFormValues } from '@/components/events/event-form'; // EventFormValues still uses 'date' for the form field

const eventsCollection = collection(db, 'events');

// EventFormValues uses 'date' for its primary date field from the form.
// We map this to 'startDate' in Firestore.
export async function createEvent(data: EventFormValues): Promise<string> {
  console.log("Creating event with form data:", data);
  const eventData: {
    name: string;
    startDate: Timestamp; // Changed from 'date' to 'startDate'
    endDate?: Timestamp;
    location: string;
    description: string;
    latitude?: number;
    longitude?: number;
  } = {
    name: data.name,
    startDate: Timestamp.fromDate(data.date), // data.date from form maps to startDate
    location: data.location,
    description: data.description,
  };

  // Assuming EventFormValues might get an endDate field later
  // For now, only startDate is handled from the current EventFormValues.date
  // if (data.endDate) {
  //   eventData.endDate = Timestamp.fromDate(data.endDate);
  // }

  if (typeof data.latitude === 'number' && !isNaN(data.latitude)) {
    eventData.latitude = data.latitude;
  }
  if (typeof data.longitude === 'number' && !isNaN(data.longitude)) {
    eventData.longitude = data.longitude;
  }

  const docRef = await addDoc(eventsCollection, eventData);
  console.log("Event created with ID:", docRef.id, "and startDate:", eventData.startDate.toDate());
  return docRef.id;
}

export async function getEvents(): Promise<Event[]> {
  console.log("Fetching all events, ordering by startDate ASC");
  const q = query(eventsCollection, orderBy('startDate', 'asc')); // Order by startDate
  const snapshot = await getDocs(q);
  console.log(`getEvents: Fetched ${snapshot.docs.length} raw event documents.`);
  
  const events = snapshot.docs.map(docSnap => {
    const data = docSnap.data();
    if (!data.startDate || typeof data.startDate.toDate !== 'function') {
      console.warn(`Event ${docSnap.id} has invalid or missing startDate. Skipping. Data:`, data);
      return null; 
    }
    const event: Event = {
      id: docSnap.id,
      name: data.name,
      startDate: (data.startDate as Timestamp).toDate().toISOString(), // Use startDate
      location: data.location,
      description: data.description,
      latitude: data.latitude,
      longitude: data.longitude,
    };
    if (data.endDate && typeof data.endDate.toDate === 'function') {
      event.endDate = (data.endDate as Timestamp).toDate().toISOString();
    }
    // console.log(`Processed event: ${event.name}, startDate: ${event.startDate}`);
    return event;
  }).filter(event => event !== null) as Event[];
  
  console.log(`getEvents: Returning ${events.length} processed events.`);
  return events;
}

export async function getEvent(eventId: string): Promise<Event | null> {
  console.log(`Fetching event with ID: ${eventId}`);
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
      startDate: (data.startDate as Timestamp).toDate().toISOString(), // Use startDate
      location: data.location,
      description: data.description,
      latitude: data.latitude,
      longitude: data.longitude,
    };
    if (data.endDate && typeof data.endDate.toDate === 'function') {
      event.endDate = (data.endDate as Timestamp).toDate().toISOString();
    }
    console.log(`Event found: ${event.name}, startDate: ${event.startDate}`);
    return event;
  }
  console.log(`Event with ID: ${eventId} not found.`);
  return null;
}

// EventFormValues uses 'date' for its primary date field from the form.
// We map this to 'startDate' in Firestore.
export async function updateEvent(eventId: string, data: EventFormValues): Promise<void> {
  console.log(`Updating event ${eventId} with form data:`, data);
  const eventRef = doc(db, 'events', eventId);
  const updatePayload: {
    name: string;
    startDate: Timestamp; // Changed from 'date' to 'startDate'
    endDate?: Timestamp | null; // Allow unsetting endDate
    location: string;
    description: string;
    latitude?: number | null;
    longitude?: number | null;
  } = {
    name: data.name,
    startDate: Timestamp.fromDate(data.date), // data.date from form maps to startDate
    location: data.location,
    description: data.description,
  };

  // if (data.endDate) { // Assuming EventFormValues might get an endDate field
  //   updatePayload.endDate = Timestamp.fromDate(data.endDate);
  // } else {
  //   updatePayload.endDate = null; // Or use deleteField() if you want to remove it
  // }


  if (data.enableGeoRestriction && typeof data.latitude === 'number' && !isNaN(data.latitude) && typeof data.longitude === 'number' && !isNaN(data.longitude) ) {
    updatePayload.latitude = data.latitude;
    updatePayload.longitude = data.longitude;
  } else {
    updatePayload.latitude = null; 
    updatePayload.longitude = null;
  }
  
  await updateDoc(eventRef, updatePayload);
  console.log(`Event ${eventId} updated. New startDate: ${updatePayload.startDate.toDate()}`);
}

export async function deleteEvent(eventId: string): Promise<void> {
  const eventRef = doc(db, 'events', eventId);
  await deleteDoc(eventRef);
}

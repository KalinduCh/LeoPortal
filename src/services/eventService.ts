
// src/services/eventService.ts
import { collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, Timestamp, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/clientApp';
import type { Event } from '@/types';
import type { EventFormValues } from '@/components/events/event-form';

const eventsCollection = collection(db, 'events');

export async function createEvent(data: EventFormValues): Promise<string> {
  const eventData: {
    name: string;
    date: Timestamp;
    location: string;
    description: string;
    latitude?: number;
    longitude?: number;
  } = {
    name: data.name,
    date: Timestamp.fromDate(data.date),
    location: data.location,
    description: data.description,
  };

  if (typeof data.latitude === 'number' && !isNaN(data.latitude)) {
    eventData.latitude = data.latitude;
  }
  if (typeof data.longitude === 'number' && !isNaN(data.longitude)) {
    eventData.longitude = data.longitude;
  }

  const docRef = await addDoc(eventsCollection, eventData);
  return docRef.id;
}

export async function getEvents(): Promise<Event[]> {
  const q = query(eventsCollection, orderBy('date', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      name: data.name,
      date: (data.date as Timestamp).toDate().toISOString(), // Convert Firestore Timestamp to ISO string
      location: data.location,
      description: data.description,
      latitude: data.latitude,
      longitude: data.longitude,
    } as Event;
  });
}

export async function getEvent(eventId: string): Promise<Event | null> {
  const eventRef = doc(db, 'events', eventId);
  const docSnap = await getDoc(eventRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      name: data.name,
      date: (data.date as Timestamp).toDate().toISOString(),
      location: data.location,
      description: data.description,
      latitude: data.latitude,
      longitude: data.longitude,
    } as Event;
  }
  return null;
}

export async function updateEvent(eventId: string, data: EventFormValues): Promise<void> {
  const eventRef = doc(db, 'events', eventId);
  const updatePayload: {
    name: string;
    date: Timestamp;
    location: string;
    description: string;
    latitude?: number | null;
    longitude?: number | null;
  } = {
    name: data.name,
    date: Timestamp.fromDate(data.date),
    location: data.location,
    description: data.description,
  };

  if (typeof data.latitude === 'number' && !isNaN(data.latitude)) {
    updatePayload.latitude = data.latitude;
  } else {
    updatePayload.latitude = null; // Explicitly set to null if not a valid number
  }

  if (typeof data.longitude === 'number' && !isNaN(data.longitude)) {
    updatePayload.longitude = data.longitude;
  } else {
    updatePayload.longitude = null; // Explicitly set to null if not a valid number
  }
  
  await updateDoc(eventRef, updatePayload);
}

export async function deleteEvent(eventId: string): Promise<void> {
  const eventRef = doc(db, 'events', eventId);
  await deleteDoc(eventRef);
}


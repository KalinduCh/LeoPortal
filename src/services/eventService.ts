// src/services/eventService.ts
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, Timestamp, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/clientApp';
import type { Event } from '@/types';
import type { EventFormValues } from '@/components/events/event-form';

const eventsCollection = collection(db, 'events');

export async function createEvent(data: EventFormValues): Promise<string> {
  const docRef = await addDoc(eventsCollection, {
    ...data,
    date: Timestamp.fromDate(data.date), // Convert JS Date to Firestore Timestamp
  });
  return docRef.id;
}

export async function getEvents(): Promise<Event[]> {
  const q = query(eventsCollection, orderBy('date', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name,
      date: (data.date as Timestamp).toDate().toISOString(), // Convert Firestore Timestamp to ISO string
      location: data.location,
      description: data.description,
    } as Event;
  });
}

export async function updateEvent(eventId: string, data: EventFormValues): Promise<void> {
  const eventRef = doc(db, 'events', eventId);
  await updateDoc(eventRef, {
    ...data,
    date: Timestamp.fromDate(data.date), // Convert JS Date to Firestore Timestamp
  });
}

export async function deleteEvent(eventId: string): Promise<void> {
  const eventRef = doc(db, 'events', eventId);
  await deleteDoc(eventRef);
}

// src/services/eventService.ts
import { collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, Timestamp, query, orderBy, deleteField } from 'firebase/firestore';
import { db } from '@/lib/firebase/clientApp';
import type { Event, EventType } from '@/types';
import type { EventFormValues } from '@/components/events/event-form';

const eventsCollection = collection(db, 'events');

export async function createEvent(data: EventFormValues): Promise<string> {
  const eventData: any = {
    name: data.name,
    startDate: data.startDate.toISOString(),
    description: data.description,
    reminderSent: false,
    galleryUrl: data.galleryUrl || null,
    uploadUrl: data.uploadUrl || null,
  };

  if (data.eventType !== 'deadline' && data.endDate) {
    eventData.endDate = data.endDate.toISOString();
  }

  if (data.eventType !== 'deadline') {
    eventData.location = data.location;
    if (data.enableGeoRestriction && typeof data.latitude === 'number') {
        eventData.latitude = data.latitude;
    }
    if (data.enableGeoRestriction && typeof data.longitude === 'number') {
        eventData.longitude = data.longitude;
    }
    if (typeof data.points === 'number' && data.points > 0) {
        eventData.points = data.points;
    }
  }

  if (data.eventType) {
      eventData.eventType = data.eventType;
  }

  const docRef = await addDoc(eventsCollection, eventData);
  return docRef.id;
}

export async function getEvents(): Promise<Event[]> {
  try {
    const q = query(eventsCollection, orderBy('startDate', 'asc'));
    const snapshot = await getDocs(q);
    const events = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      if (!data.startDate) return null;
      const event: Event = {
        id: docSnap.id,
        name: data.name,
        startDate: data.startDate,
        location: data.location || '',
        description: data.description || '',
        latitude: data.latitude,
        longitude: data.longitude,
        reminderSent: data.reminderSent || false,
        eventType: data.eventType,
        points: data.points,
        galleryUrl: data.galleryUrl,
        uploadUrl: data.uploadUrl,
      };
      if (data.endDate) {
        event.endDate = data.endDate;
      }
      return event;
    }).filter(event => event !== null) as Event[];
    return events;
  } catch (error) {
      console.error("Error in getEvents:", error);
      return [];
  }
}

export async function getEvent(eventId: string): Promise<Event | null> {
  const eventRef = doc(db, 'events', eventId);
  const docSnap = await getDoc(eventRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    const event: Event = {
      id: docSnap.id,
      name: data.name,
      startDate: data.startDate,
      location: data.location || '',
      description: data.description || '',
      latitude: data.latitude,
      longitude: data.longitude,
      reminderSent: data.reminderSent || false,
      eventType: data.eventType,
      points: data.points,
      galleryUrl: data.galleryUrl,
      uploadUrl: data.uploadUrl,
    };
    if (data.endDate) {
      event.endDate = data.endDate;
    }
    return event;
  }
  return null;
}

export async function updateEvent(eventId: string, data: EventFormValues): Promise<void> {
  const eventRef = doc(db, 'events', eventId);
  const updatePayload: any = {
    name: data.name,
    startDate: data.startDate.toISOString(),
    description: data.description,
    eventType: data.eventType || deleteField(),
    galleryUrl: data.galleryUrl || deleteField(),
    uploadUrl: data.uploadUrl || deleteField(),
  };

  if (data.eventType === 'deadline') {
    updatePayload.endDate = deleteField();
    updatePayload.location = deleteField();
    updatePayload.latitude = deleteField();
    updatePayload.longitude = deleteField();
    updatePayload.points = deleteField();
  } else {
    updatePayload.endDate = data.endDate ? data.endDate.toISOString() : deleteField();
    updatePayload.location = data.location;
    updatePayload.points = (typeof data.points === 'number' && data.points > 0) ? data.points : deleteField();
    if (data.enableGeoRestriction && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
        updatePayload.latitude = data.latitude;
        updatePayload.longitude = data.longitude;
    } else {
        updatePayload.latitude = deleteField();
        updatePayload.longitude = deleteField();
    }
  }
  await updateDoc(eventRef, updatePayload);
}

export async function deleteEvent(eventId: string): Promise<void> {
  const eventRef = doc(db, 'events', eventId);
  await deleteDoc(eventRef);
}

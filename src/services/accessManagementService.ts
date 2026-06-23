import {
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/clientApp';
import type { AccessEvent, AccessRegistration, RegistrationStatus } from '@/types/access-management';

const EVENTS_COLLECTION = 'accessEvents';
const REGISTRATIONS_COLLECTION = 'accessRegistrations';

// --- Event Management ---

export async function createAccessEvent(data: Omit<AccessEvent, 'id' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, EVENTS_COLLECTION), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getAccessEvents(): Promise<AccessEvent[]> {
  const q = query(collection(db, EVENTS_COLLECTION), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AccessEvent));
}

export async function getAccessEvent(id: string): Promise<AccessEvent | null> {
  const docRef = doc(db, EVENTS_COLLECTION, id);
  const snap = await getDoc(docRef);
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as AccessEvent) : null;
}

// --- Registration Management ---

export async function createRegistration(data: Omit<AccessRegistration, 'id' | 'createdAt' | 'status'>): Promise<string> {
  const docRef = await addDoc(collection(db, REGISTRATIONS_COLLECTION), {
    ...data,
    status: 'registered',
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export function subscribeToRegistrations(eventId: string, callback: (registrations: AccessRegistration[]) => void) {
  const q = query(
    collection(db, REGISTRATIONS_COLLECTION),
    where('eventId', '==', eventId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const registrations = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AccessRegistration));
    callback(registrations);
  });
}

export async function getRegistrationByTicket(ticketId: string): Promise<AccessRegistration | null> {
  const q = query(collection(db, REGISTRATIONS_COLLECTION), where('ticketId', '==', ticketId));
  const snap = await getDocs(q);
  return snap.empty ? null : ({ id: snap.docs[0].id, ...snap.docs[0].data() } as AccessRegistration);
}

export async function markCheckIn(registrationId: string): Promise<void> {
  const docRef = doc(db, REGISTRATIONS_COLLECTION, registrationId);
  await updateDoc(docRef, {
    status: 'checked_in',
    checkInTime: new Date().toISOString(),
  });
}

export async function deleteRegistration(id: string): Promise<void> {
  await deleteDoc(doc(db, REGISTRATIONS_COLLECTION, id));
}
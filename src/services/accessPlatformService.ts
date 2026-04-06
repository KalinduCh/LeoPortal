
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
import type { AccessEvent, AccessRegistration } from '@/types/access-platform';

const PLATFORM_EVENTS = 'accessEvents';
const PLATFORM_REGISTRATIONS = 'accessRegistrations';

export async function createPlatformEvent(data: Omit<AccessEvent, 'id' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, PLATFORM_EVENTS), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getPlatformEvents(): Promise<AccessEvent[]> {
  const q = query(collection(db, PLATFORM_EVENTS), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AccessEvent));
}

export async function getPlatformEvent(id: string): Promise<AccessEvent | null> {
  const docRef = doc(db, PLATFORM_EVENTS, id);
  const snap = await getDoc(docRef);
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as AccessEvent) : null;
}

export function subscribeToPlatformRegistrations(eventId: string, callback: (registrations: AccessRegistration[]) => void) {
  const q = query(
    collection(db, PLATFORM_REGISTRATIONS),
    where('eventId', '==', eventId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const registrations = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AccessRegistration));
    callback(registrations);
  });
}

export async function getRegistrationByTicket(ticketId: string): Promise<AccessRegistration | null> {
  const q = query(collection(db, PLATFORM_REGISTRATIONS), where('ticketId', '==', ticketId));
  const snap = await getDocs(q);
  return snap.empty ? null : ({ id: snap.docs[0].id, ...snap.docs[0].data() } as AccessRegistration);
}

export async function markPlatformCheckIn(registrationId: string): Promise<void> {
  const docRef = doc(db, PLATFORM_REGISTRATIONS, registrationId);
  await updateDoc(docRef, {
    status: 'checked_in',
    checkInTime: new Date().toISOString(),
  });
}

export async function deletePlatformRegistration(id: string): Promise<void> {
  await deleteDoc(doc(db, PLATFORM_REGISTRATIONS, id));
}

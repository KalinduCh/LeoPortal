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

// These collection names MUST match firestore.rules exactly
const PLATFORM_EVENTS = 'accessEvents';
const PLATFORM_REGISTRATIONS = 'accessRegistrations';

/**
 * Creates a new standalone district event module.
 */
export async function createPlatformEvent(data: Omit<AccessEvent, 'id' | 'createdAt'>): Promise<string> {
  const cleanData: any = {
    ...data,
    createdAt: serverTimestamp(),
  };

  // Remove undefined fields to prevent Firebase errors
  Object.keys(cleanData).forEach(key => {
    if (cleanData[key] === undefined || cleanData[key] === '') {
      delete cleanData[key];
    }
  });

  const docRef = await addDoc(collection(db, PLATFORM_EVENTS), cleanData);
  return docRef.id;
}

/**
 * Fetches all available event modules for the organizer dashboard.
 */
export async function getPlatformEvents(): Promise<AccessEvent[]> {
  const q = query(collection(db, PLATFORM_EVENTS), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AccessEvent));
}

/**
 * Fetches single event configuration.
 */
export async function getPlatformEvent(id: string): Promise<AccessEvent | null> {
  const docRef = doc(db, PLATFORM_EVENTS, id);
  const snap = await getDoc(docRef);
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as AccessEvent) : null;
}

/**
 * Listens to real-time registration and check-in updates for an event dashboard.
 * Note: orderBy removed from query to avoid composite index requirement. 
 * Sorting is handled in memory.
 */
export function subscribeToPlatformRegistrations(eventId: string, callback: (registrations: AccessRegistration[]) => void) {
  const q = query(
    collection(db, PLATFORM_REGISTRATIONS),
    where('eventId', '==', eventId)
  );

  return onSnapshot(q, (snapshot) => {
    const registrations = snapshot.docs.map(d => {
        const data = d.data();
        return { 
            id: d.id, 
            ...data,
            // Fallback for missing createdAt to prevent sorting errors
            createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString() 
        } as AccessRegistration;
    });
    
    // Sort by createdAt descending in memory
    const sorted = registrations.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    callback(sorted);
  });
}

/**
 * Searches for a registration by ticket ID (used by the entry scanner).
 */
export async function getRegistrationByTicket(ticketId: string): Promise<AccessRegistration | null> {
  const q = query(collection(db, PLATFORM_REGISTRATIONS), where('ticketId', '==', ticketId));
  const snap = await getDocs(q);
  return snap.empty ? null : ({ id: snap.docs[0].id, ...snap.docs[0].data() } as AccessRegistration);
}

/**
 * Marks a guest as checked-in with a timestamp.
 */
export async function markPlatformCheckIn(registrationId: string): Promise<void> {
  const docRef = doc(db, PLATFORM_REGISTRATIONS, registrationId);
  await updateDoc(docRef, {
    status: 'checked_in',
    checkInTime: new Date().toISOString(),
  });
}

/**
 * Deletes a registration pass permanently.
 */
export async function deletePlatformRegistration(id: string): Promise<void> {
  await deleteDoc(doc(db, PLATFORM_REGISTRATIONS, id));
}

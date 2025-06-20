
// src/services/attendanceService.ts
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  Timestamp,
  serverTimestamp,
  limit,
  orderBy,
  doc, // Added for fetching the new doc
  getDoc   // Added for fetching the new doc
} from 'firebase/firestore';
import { db } from '@/lib/firebase/clientApp';
import type { AttendanceRecord } from '@/types';

const attendanceCollectionRef = collection(db, 'attendance');

export interface MarkAttendanceResult {
  status: 'success' | 'already_marked' | 'error'; // 'error' might not be used if we throw for unexpected errors
  message: string;
  record?: AttendanceRecord; // The newly created OR existing record
}

export async function markUserAttendance(
  eventId: string,
  userId: string,
  markedLatitude?: number,
  markedLongitude?: number
): Promise<MarkAttendanceResult> {
  const existingAttendance = await getUserAttendanceForEvent(eventId, userId);
  if (existingAttendance) {
    return { 
      status: 'already_marked', 
      message: 'Attendance already marked for this event.',
      record: existingAttendance 
    };
  }

  const attendanceData: Omit<AttendanceRecord, 'id' | 'timestamp'> & { timestamp: any; createdAt: any } = {
    eventId,
    userId,
    status: 'present',
    createdAt: serverTimestamp(), 
    timestamp: Timestamp.now(),   
  };

  if (markedLatitude !== undefined && markedLongitude !== undefined) {
    attendanceData.markedLatitude = markedLatitude;
    attendanceData.markedLongitude = markedLongitude;
  }

  try {
    const docRef = await addDoc(attendanceCollectionRef, attendanceData);
    // Fetch the newly created document to get server-generated timestamps correctly
    const newDocSnap = await getDoc(doc(db, 'attendance', docRef.id));
    if (newDocSnap.exists()) {
        const newData = newDocSnap.data();
        const newRecord: AttendanceRecord = {
            id: newDocSnap.id,
            eventId: newData.eventId,
            userId: newData.userId,
            timestamp: (newData.timestamp as Timestamp).toDate().toISOString(),
            status: newData.status,
            markedLatitude: newData.markedLatitude,
            markedLongitude: newData.markedLongitude,
        };
        return { 
          status: 'success', 
          message: 'Your attendance has been recorded.',
          record: newRecord
        };
    } else {
        // Should not happen if addDoc succeeded
        throw new Error("Failed to retrieve newly created attendance record.");
    }
  } catch (error) {
    // Re-throw unexpected database errors to be caught by EventCard
    console.error("Error adding attendance document to Firestore:", error);
    throw error; 
  }
}


export async function getUserAttendanceForEvent(
  eventId: string,
  userId: string
): Promise<AttendanceRecord | null> {
  const q = query(
    attendanceCollectionRef,
    where('eventId', '==', eventId),
    where('userId', '==', userId),
    limit(1)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    return null;
  }
  const docData = snapshot.docs[0].data();
  return {
    id: snapshot.docs[0].id,
    eventId: docData.eventId,
    userId: docData.userId,
    timestamp: (docData.timestamp as Timestamp).toDate().toISOString(),
    status: docData.status,
    markedLatitude: docData.markedLatitude,
    markedLongitude: docData.markedLongitude,
  } as AttendanceRecord;
}

export async function getAttendanceRecordsForUser(userId: string): Promise<AttendanceRecord[]> {
  const q = query(attendanceCollectionRef, where('userId', '==', userId), orderBy('timestamp', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      eventId: data.eventId,
      userId: data.userId,
      timestamp: (data.timestamp as Timestamp).toDate().toISOString(),
      status: data.status,
      markedLatitude: data.markedLatitude,
      markedLongitude: data.markedLongitude,
    } as AttendanceRecord;
  });
}

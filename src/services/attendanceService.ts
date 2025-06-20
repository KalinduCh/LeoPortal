
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
} from 'firebase/firestore';
import { db } from '@/lib/firebase/clientApp';
import type { AttendanceRecord } from '@/types';

const attendanceCollectionRef = collection(db, 'attendance');

export async function markUserAttendance(
  eventId: string,
  userId: string,
  markedLatitude?: number,
  markedLongitude?: number
): Promise<string> {
  const existingAttendance = await getUserAttendanceForEvent(eventId, userId);
  if (existingAttendance) {
    // For now, prevent re-marking. Consider if updating timestamp is desired.
    throw new Error("Attendance already marked for this event.");
  }

  const attendanceData: Omit<AttendanceRecord, 'id' | 'timestamp'> & { timestamp: any; createdAt: any } = {
    eventId,
    userId,
    status: 'present',
    createdAt: serverTimestamp(), // Firestore server timestamp for creation log
    timestamp: Timestamp.now(),   // Actual time attendance was marked
  };

  if (markedLatitude !== undefined && markedLongitude !== undefined) {
    attendanceData.markedLatitude = markedLatitude;
    attendanceData.markedLongitude = markedLongitude;
  }

  const docRef = await addDoc(attendanceCollectionRef, attendanceData);
  return docRef.id;
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
  const doc = snapshot.docs[0];
  const data = doc.data();
  return {
    id: doc.id,
    eventId: data.eventId,
    userId: data.userId,
    timestamp: (data.timestamp as Timestamp).toDate().toISOString(),
    status: data.status,
    markedLatitude: data.markedLatitude,
    markedLongitude: data.markedLongitude,
  } as AttendanceRecord;
}

export async function getAttendanceRecordsForUser(userId: string): Promise<AttendanceRecord[]> {
  const q = query(attendanceCollectionRef, where('userId', '==', userId), orderBy('timestamp', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      eventId: data.eventId,
      userId: data.userId,
      timestamp: (data.timestamp as Timestamp).toDate().toISOString(),
      status: data.status,
      markedLatitude: data.markedLatitude,
      markedLongitude: data.markedLongitude,
    } as AttendanceRecord;
  });
}

// Optional: For admins to view all attendance for an event
// export async function getAttendanceForEvent(eventId: string): Promise<AttendanceRecord[]> {
//   const q = query(attendanceCollection, where('eventId', '==', eventId), orderBy('timestamp', 'desc'));
//   const snapshot = await getDocs(q);
//   // ... mapping logic
// }
